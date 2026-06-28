import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceDir =
  process.env.GEORGE_AI_LEADERBOARD_DIR ||
  path.resolve(root, "..", "george-ai-leaderboard", "companies");
const outputPath = path.join(root, "data", "companies.json");

const requiredFields = [
  "id",
  "company",
  "description",
  "location",
  "annual_revenue",
  "employees",
  "revenue_per_employee",
  "profitable",
  "total_funding",
  "valuation",
  "valuation_per_employee",
  "founded",
  "last_updated",
  "website",
  "source_label",
  "source_type",
  "qualification",
  "status",
];

function parseFrontmatter(markdown, sourcePath) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  const fields = {};

  if (!match) {
    throw new Error(`${sourcePath} is missing frontmatter`);
  }

  for (const line of match[1].split("\n")) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!field) continue;
    fields[field[1]] = field[2].trim().replace(/^["']|["']$/g, "");
  }

  return fields;
}

function money(display) {
  const clean = (display || "").trim();
  const numeric = Number(clean.replace(/[$,]/g, ""));

  return {
    display: clean || "Unknown",
    value: Number.isFinite(numeric) && clean ? numeric : null,
  };
}

function numberValue(display) {
  const clean = String(display || "").replace(/,/g, "").trim();
  if (!clean) return null;
  const numeric = Number(clean);
  return Number.isFinite(numeric) ? numeric : null;
}

function validateFields(fields, sourcePath) {
  const missing = requiredFields.filter((field) => fields[field] === undefined);

  if (missing.length > 0) {
    throw new Error(`${sourcePath} missing frontmatter fields: ${missing.join(", ")}`);
  }

  for (const field of ["id", "company", "website"]) {
    if (!fields[field]) {
      throw new Error(`${sourcePath} has empty required field: ${field}`);
    }
  }
}

function toCompany(markdown, sourcePath) {
  const fields = parseFrontmatter(markdown, sourcePath);
  validateFields(fields, sourcePath);
  const rank = numberValue(fields.radar_order) ?? 9999;

  return {
    id: fields.id,
    rank,
    company: fields.company,
    description: fields.description,
    location: fields.location || "Unknown",
    annualRevenue: money(fields.annual_revenue),
    employees: numberValue(fields.employees),
    revenuePerEmployee: money(fields.revenue_per_employee),
    profitable: fields.profitable === "Yes" ? "Yes" : fields.profitable === "No" ? "No" : "Unknown",
    monthsToArr: numberValue(fields.months_to_arr),
    totalFunding: money(fields.total_funding),
    valuation: money(fields.valuation),
    valuationPerEmployee: money(fields.valuation_per_employee),
    founded: numberValue(fields.founded),
    lastUpdated: fields.last_updated || "",
    source: fields.source_url || "",
    sourceLabel: fields.source_label || "Needs source",
    sourceType: fields.source_type || "unknown",
    website: fields.website,
    qualification: fields.qualification || "watchlist",
  };
}

async function readCompanies() {
  const entries = await readdir(sourceDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(sourceDir, entry.name))
    .sort();

  if (files.length === 0) {
    throw new Error(`No company markdown files found in ${sourceDir}`);
  }

  const companies = [];

  for (const file of files) {
    companies.push(toCompany(await readFile(file, "utf8"), path.relative(root, file)));
  }

  return companies.sort((left, right) => left.rank - right.rank || left.company.localeCompare(right.company));
}

async function main() {
  const companies = await readCompanies();
  const generated = `${JSON.stringify(companies, null, 2)}\n`;
  await mkdir(path.dirname(outputPath), { recursive: true });

  if (process.argv.includes("--check")) {
    let existing = "";
    try {
      existing = await readFile(outputPath, "utf8");
    } catch {
      existing = "";
    }

    if (existing !== generated) {
      throw new Error("Generated companies data is stale. Run npm run sync:leaderboard.");
    }
    return;
  }

  await writeFile(outputPath, generated);
  console.log(
    `Synced ${companies.length} companies from ${path.relative(root, sourceDir)} to ${path.relative(root, outputPath)}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
