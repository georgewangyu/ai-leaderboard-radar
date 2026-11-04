import { describe, expect, test } from "vitest";
import { issueBody, issueLabels, issueTitle } from "@/lib/github-issue";
import {
  leaderboardSubmissionSchema,
  type LeaderboardSubmission,
} from "@/lib/submission-schema";

function parsed(overrides: Record<string, unknown> = {}): LeaderboardSubmission {
  return leaderboardSubmissionSchema.parse({
    submissionType: "update-company",
    title: "  Acme AI  ",
    outcome: "Crossed 10M ARR with a team of 8.",
    ...overrides,
  });
}

describe("leaderboardSubmissionSchema", () => {
  test("trims fields and defaults visibility, context, handle and honeypot", () => {
    expect(parsed()).toEqual({
      submissionType: "update-company",
      visibility: "public",
      title: "Acme AI",
      outcome: "Crossed 10M ARR with a team of 8.",
      context: "",
      handle: "",
      website: "",
    });
  });

  test("reports length and honeypot violations by field", () => {
    const result = leaderboardSubmissionSchema.safeParse({
      submissionType: "submit-company",
      title: "x",
      outcome: "short",
      context: "c".repeat(1601),
      handle: "h".repeat(121),
      website: "bot",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(Object.keys(result.error.flatten().fieldErrors).sort()).toEqual(
      ["context", "handle", "outcome", "title", "website"],
    );
  });
});

describe("issue formatting", () => {
  test("title is prefixed by type and compacted to 78 chars", () => {
    const title = issueTitle(parsed({ title: "word ".repeat(20) }));
    expect(title.startsWith("[ai-leaderboard-radar:update-company] ")).toBe(true);
    expect(title.endsWith("...")).toBe(true);
    expect(title.length).toBe("[ai-leaderboard-radar:update-company] ".length + 78);
  });

  test("labels carry repo, triage, type and visibility", () => {
    expect(issueLabels(parsed({ visibility: "private" }))).toEqual([
      "ai-leaderboard-radar",
      "source-repo:ai-leaderboard-radar",
      "status:needs-triage",
      "type:update-company",
      "visibility:private",
    ]);
  });

  test("body shows placeholders for missing handle and context", () => {
    const body = issueBody(parsed());
    expect(body).toContain("**Handle:** _Anonymous / not provided_");
    expect(body).toContain("## Source or context\n\n_Not provided_");
    expect(body).toContain("## Company\n\nAcme AI");
    expect(body).toContain("**Visibility:** Public GitHub issue");
  });
});
