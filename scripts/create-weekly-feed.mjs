import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const companiesPath = path.join(root, "data", "companies.json");
const memoryPath = path.join(root, "memory", "seen-company-ids.json");
const feedRoot = path.join(root, "feeds");
const maxFeatured = 12;

function localDate() {
  if (process.env.AI_LEADERBOARD_RADAR_FEED_DATE) {
    return process.env.AI_LEADERBOARD_RADAR_FEED_DATE;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Los_Angeles",
    year: "numeric",
  }).formatToParts(new Date());
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${byType.year}-${byType.month}-${byType.day}`;
}

async function readCompanies() {
  return JSON.parse(await readFile(companiesPath, "utf8"));
}

async function readSeenIds() {
  if (process.env.AI_LEADERBOARD_RADAR_FEED_RESET === "1") {
    return new Set();
  }

  try {
    const raw = await readFile(memoryPath, "utf8");
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed.companyIds) ? parsed.companyIds : []);
  } catch (error) {
    if (error.code === "ENOENT") return new Set();
    throw error;
  }
}

function score(company) {
  let value = 0;
  value += Math.min(10, Math.floor((company.revenuePerEmployee.value || 0) / 1_000_000));
  if (company.employees === 1) value += 8;
  if (company.sourceType === "public") value += 3;
  if (company.qualification === "qualifies") value += 3;
  if (company.profitable === "Yes") value += 2;
  return value;
}

function selectFeatured(companies, seenIds) {
  const newCompanies = companies.filter((company) => !seenIds.has(company.id));
  const pool = newCompanies.length ? newCompanies : companies;
  const featured = [...pool]
    .sort((left, right) => score(right) - score(left) || left.rank - right.rank)
    .slice(0, maxFeatured);

  return {
    featured,
    hasNewCompanies: newCompanies.length > 0,
    newCompanyCount: newCompanies.length,
  };
}

function dailyRotation(featured) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  return days.map((day, index) => ({
    company: featured[index],
    day,
  }));
}

function renderFeed({ companies, date, featured, hasNewCompanies, newCompanyCount }) {
  const totalRevenue = companies.reduce((sum, company) => sum + (company.annualRevenue.value || 0), 0);
  const publicSources = companies.filter((company) => company.sourceType === "public").length;
  const onePersonRows = companies.filter((company) => company.employees === 1).length;
  const rotation = dailyRotation(featured).filter((entry) => entry.company);

  return `# AI Leaderboard Radar Weekly Feed - ${date}

Updated after the AI Leaderboard Radar source sync.

<!-- ai-leaderboard-radar-feed-version: 1 -->
<!-- featured-company-ids: ${featured.map((company) => company.id).join(", ")} -->

## Summary

- Catalog count: ${companies.length} companies.
- New companies since the last feed: ${hasNewCompanies ? newCompanyCount : 0}.
- Public-source rows: ${publicSources}.
- One-person rows: ${onePersonRows}.
- Total listed annual revenue: $${totalRevenue.toLocaleString("en-US")}.
- Feed mode: ${hasNewCompanies ? "new companies first" : "rotation from the existing catalog"}.

## Featured Companies

${featured
  .map(
    (company) => `- [${company.company}](${company.website || company.source || "https://aileaderboardradar.snackoverflowgeorge.com"})
  - Rank: ${company.rank >= 9999 ? "Watchlist" : `#${company.rank}`}
  - Description: ${company.description || "Unknown"}
  - Revenue per employee: ${company.revenuePerEmployee.display}
  - Annual revenue: ${company.annualRevenue.display}
  - Team size: ${company.employees ?? "Unknown"}
  - Source: ${company.sourceLabel} / ${company.source || "No receipt listed"}`,
  )
  .join("\n\n")}

## Daily Study Rotation

${rotation
  .map(
    (entry) =>
      `- ${entry.day}: [${entry.company.company}](${entry.company.website || entry.company.source || "https://aileaderboardradar.snackoverflowgeorge.com"}) - ${entry.company.revenuePerEmployee.display} revenue/employee`,
  )
  .join("\n")}

## Agent Setup Prompt

Ask your agent:

\`\`\`text
Use AI Leaderboard Radar. Read the latest weekly feed, pick one lean AI-native
company worth studying, summarize the source-backed metrics, and give me one
operating pattern to investigate.
\`\`\`

## Builder Takeaways

- Use: study one company from the daily rotation before adding it to public writing.
- Verify: inspect the source receipt before repeating private-company metrics.
- Submit: send new companies or corrections through the AI Leaderboard Radar form.

## Source Receipts

${featured.map((company) => `- ${company.source || "No receipt listed"} (${company.company})`).join("\n")}
`;
}

async function main() {
  const date = localDate();
  const [year, month] = date.split("-");
  const companies = await readCompanies();
  const seenIds = await readSeenIds();
  const selection = selectFeatured(companies, seenIds);
  const feedDir = path.join(feedRoot, year, month);
  const feedPath = path.join(feedDir, `${date}.md`);

  await mkdir(feedDir, { recursive: true });
  await mkdir(path.dirname(memoryPath), { recursive: true });
  await writeFile(feedPath, renderFeed({ companies, date, ...selection }), "utf8");
  await writeFile(
    memoryPath,
    `${JSON.stringify(
      {
        companyCount: companies.length,
        companyIds: companies.map((company) => company.id).sort(),
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`Wrote ${path.relative(root, feedPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
