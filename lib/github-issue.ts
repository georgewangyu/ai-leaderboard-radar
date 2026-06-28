import type { LeaderboardSubmission } from "./submission-schema";

const sourceRepo = "ai-leaderboard-radar";

const typeLabels: Record<LeaderboardSubmission["submissionType"], string> = {
  "submit-company": "type:submit-company",
  "update-company": "type:update-company",
  "question-source": "type:question-source",
};

const typeTitles: Record<LeaderboardSubmission["submissionType"], string> = {
  "submit-company": "Submit company",
  "update-company": "Update company",
  "question-source": "Question source",
};

function compactTitle(input: string) {
  const singleLine = input.replace(/\s+/g, " ").trim();
  return singleLine.length > 78 ? `${singleLine.slice(0, 75)}...` : singleLine;
}

export function issueTitle(submission: LeaderboardSubmission) {
  return `[ai-leaderboard-radar:${submission.submissionType}] ${compactTitle(submission.title)}`;
}

export function issueLabels(submission: LeaderboardSubmission) {
  return [
    sourceRepo,
    `source-repo:${sourceRepo}`,
    "status:needs-triage",
    typeLabels[submission.submissionType],
    `visibility:${submission.visibility}`,
  ];
}

export function issueBody(submission: LeaderboardSubmission) {
  const handle = submission.handle || "_Anonymous / not provided_";
  const context = submission.context || "_Not provided_";
  const visibility =
    submission.visibility === "private" ? "Private review issue" : "Public GitHub issue";

  return [
    "## AI Leaderboard Radar submission",
    "",
    `**Type:** ${typeTitles[submission.submissionType]}`,
    `**Source repo:** ${sourceRepo}`,
    `**Visibility:** ${visibility}`,
    `**Handle:** ${handle}`,
    "",
    "## Company",
    "",
    submission.title,
    "",
    "## Update",
    "",
    submission.outcome,
    "",
    "## Source or context",
    "",
    context,
    "",
    "## Triage checklist",
    "",
    "- [ ] Check whether the company already appears in the generated data",
    "- [ ] Verify revenue, team size, and timing against source receipts",
    "- [ ] Decide whether the row qualifies, is an exception, or belongs on a watchlist",
    "- [ ] Run npm run sync:leaderboard and npm run feed:weekly after acceptance",
  ].join("\n");
}

export async function createGitHubIssue(submission: LeaderboardSubmission) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo =
    submission.visibility === "private"
      ? process.env.GITHUB_PRIVATE_REPO
      : process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    throw new Error("Missing GitHub issue environment configuration.");
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": process.env.GITHUB_API_VERSION || "2022-11-28",
    },
    body: JSON.stringify({
      title: issueTitle(submission),
      body: issueBody(submission),
      labels: issueLabels(submission),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub issue creation failed: ${response.status} ${body}`);
  }

  return (await response.json()) as { html_url: string; number: number };
}
