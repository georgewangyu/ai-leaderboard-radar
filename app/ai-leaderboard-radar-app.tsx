"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BrandMark } from "./brand-mark";
import type { AiCompany } from "@/lib/companies";
import { formatCompactCurrency, locations, qualificationModes, sourceTypes, totals } from "@/lib/companies";

type Props = {
  companies: AiCompany[];
};

type SortMode = "rank" | "revenue-per-employee" | "revenue" | "team-size" | "updated";
type Status = "idle" | "submitting" | "success" | "error";

const pageSize = 14;
const skillInstallCommand =
  "npx skills add georgewangyu/ai-leaderboard-radar --skill ai-leaderboard-radar -g";
const skillRepoUrl = "https://github.com/georgewangyu/ai-leaderboard-radar";
const leadStorageKey = "ai-leaderboard-radar-install-unlocked";

const leadLabels: Record<string, string> = {
  email: "Email",
  name: "Name",
  website: "Website",
};

const sortLabels: Record<SortMode, string> = {
  rank: "Source rank",
  "revenue-per-employee": "Revenue/employee",
  revenue: "Annual revenue",
  "team-size": "Smallest team",
  updated: "Recently updated",
};

function parseUpdated(value: string) {
  if (!value) return 0;
  return Date.parse(`1 ${value}`) || Date.parse(value) || 0;
}

function sortCompanies(items: AiCompany[], sortMode: SortMode) {
  return [...items].sort((left, right) => {
    if (sortMode === "revenue-per-employee") {
      return (right.revenuePerEmployee.value || 0) - (left.revenuePerEmployee.value || 0);
    }

    if (sortMode === "revenue") {
      return (right.annualRevenue.value || 0) - (left.annualRevenue.value || 0);
    }

    if (sortMode === "team-size") {
      return (left.employees || 9999) - (right.employees || 9999) || left.rank - right.rank;
    }

    if (sortMode === "updated") {
      return parseUpdated(right.lastUpdated) - parseUpdated(left.lastUpdated) || left.rank - right.rank;
    }

    return left.rank - right.rank;
  });
}

function sourceTypeLabel(value: string) {
  return value
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function rankLabel(rank: number) {
  return rank >= 9999 ? "Watch" : `#${rank}`;
}

async function errorMessageFor(response: Response) {
  if (response.status !== 400) {
    return "Something went wrong. Try again or send the tip another way.";
  }

  const body = (await response.json().catch(() => null)) as
    | { error?: string; issues?: Record<string, string[] | undefined> }
    | null;
  const fieldMessages = Object.entries(body?.issues || {}).flatMap(([field, messages]) =>
    (messages || []).map((message) => `${field}: ${message}`),
  );

  return fieldMessages.length ? fieldMessages.join(" ") : body?.error || "Check the form and try again.";
}

async function leadErrorMessageFor(response: Response) {
  if (response.status !== 400) {
    return "Could not unlock the install command. Try again in a moment.";
  }

  const body = (await response.json().catch(() => null)) as
    | { error?: string; issues?: Record<string, string[] | undefined> }
    | null;
  const fieldMessages = Object.entries(body?.issues || {}).flatMap(([field, messages]) =>
    (messages || []).map((message) => `${leadLabels[field] || field}: ${message}`),
  );

  return fieldMessages.length ? fieldMessages.join(" ") : body?.error || "Check your email and try again.";
}

export function AiLeaderboardRadarApp({ companies }: Props) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("All");
  const [sourceType, setSourceType] = useState("All");
  const [qualification, setQualification] = useState("All");
  const [sortMode, setSortMode] = useState<SortMode>("revenue-per-employee");
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const [formStatus, setFormStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [leadStatus, setLeadStatus] = useState<Status>("idle");
  const [leadUnlocked, setLeadUnlocked] = useState(false);
  const [leadError, setLeadError] = useState("");

  const filteredCompanies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return companies.filter((company) => {
      const matchesLocation = location === "All" || company.location === location;
      const matchesSourceType = sourceType === "All" || company.sourceType === sourceType;
      const matchesQualification = qualification === "All" || company.qualification === qualification;
      const haystack = [
        company.company,
        company.description,
        company.location,
        company.profitable,
        company.lastUpdated,
        company.source,
        company.sourceLabel,
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesLocation &&
        matchesSourceType &&
        matchesQualification &&
        (!normalizedQuery || haystack.includes(normalizedQuery))
      );
    });
  }, [companies, location, qualification, query, sourceType]);

  const sortedCompanies = useMemo(
    () => sortCompanies(filteredCompanies, sortMode),
    [filteredCompanies, sortMode],
  );
  const pageCount = Math.max(1, Math.ceil(sortedCompanies.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, sortedCompanies.length);
  const visibleCompanies = sortedCompanies.slice(pageStart, pageEnd);

  useEffect(() => {
    setPage(1);
  }, [location, qualification, query, sortMode, sourceType]);

  useEffect(() => {
    setLeadUnlocked(window.localStorage.getItem(leadStorageKey) === "true");
  }, []);

  async function copyCommand() {
    await navigator.clipboard.writeText(skillInstallCommand);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    setLeadStatus("submitting");
    setLeadError("");

    try {
      const response = await fetch("/api/leads", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        setLeadStatus("error");
        setLeadError(await leadErrorMessageFor(response));
        return;
      }

      window.localStorage.setItem(leadStorageKey, "true");
      setLeadUnlocked(true);
      setLeadStatus("success");
      form.reset();
    } catch {
      setLeadStatus("error");
      setLeadError("Could not unlock the install command. Try again in a moment.");
    }
  }

  async function submitTip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    setFormStatus("submitting");
    setError("");

    const response = await fetch("/api/submit", {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      setFormStatus("error");
      setError(await errorMessageFor(response));
      return;
    }

    form.reset();
    setFormStatus("success");
  }

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <BrandMark />
          <span>AI Leaderboard Radar</span>
        </Link>
        <nav className="nav-pills" aria-label="Main navigation">
          <a href="#leaderboard">Leaderboard</a>
          <a href="#sources">Sources</a>
          <a href="#skill">Skill</a>
        </nav>
        <a className="primary nav-submit" href="#skill">
          Unlock skill
        </a>
      </header>

      <section className="dashboard-band">
        <div className="dashboard-copy">
          <p className="eyebrow">Lean AI-native company tracker</p>
          <h1>AI Leaderboard Radar</h1>
          <p>
            Search high-revenue, small-team AI companies, inspect revenue per employee, and keep a
            weekly agent-readable feed synced from public leaderboard sources.
          </p>
        </div>
        <article className="install-card" id="skill">
          <p className="eyebrow">Installable skill</p>
          <h2>Use it in Codex.</h2>
          <p>
            Install the skill, then ask for a daily company to study or a weekly leaderboard digest.
          </p>
          {leadUnlocked ? (
            <div className="setup-command">
              <code>{skillInstallCommand}</code>
              <div className="setup-actions">
                <button className="primary wide" onClick={copyCommand}>
                  {copied ? "Copied" : "Copy command"}
                </button>
                <a href={skillRepoUrl}>Star the repo</a>
              </div>
              <p className="form-note">
                Star AI Leaderboard Radar to save it and support the project.
              </p>
            </div>
          ) : (
            <form className="unlock-form" onSubmit={submitLead}>
              <label>
                Name
                <input name="name" autoComplete="name" required />
              </label>
              <label>
                Email
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <input name="website" className="honeypot" tabIndex={-1} autoComplete="off" />
              <button className="primary wide" disabled={leadStatus === "submitting"} type="submit">
                {leadStatus === "submitting" ? "Unlocking..." : "Unlock install command"}
              </button>
              <p className="form-note">Unlocks the skill command and occasional updates. No spam.</p>
              {leadStatus === "error" ? <p className="form-note error">{leadError}</p> : null}
            </form>
          )}
        </article>
      </section>

      <section className="metrics-band" aria-label="Leaderboard metrics">
        <div className="kpi">
          <span>Total revenue</span>
          <strong>{formatCompactCurrency(totals.totalRevenue)}</strong>
        </div>
        <div className="kpi">
          <span>Avg revenue/employee</span>
          <strong>{formatCompactCurrency(totals.averageRevenuePerEmployee)}</strong>
        </div>
        <div className="kpi">
          <span>Median team</span>
          <strong>{totals.medianEmployees}</strong>
        </div>
        <div className="kpi">
          <span>One-person rows</span>
          <strong>{totals.onePersonCount}</strong>
        </div>
      </section>

      <section className="leaderboard-panel" id="leaderboard">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Catalog</p>
            <h2>Companies</h2>
          </div>
          <p className="result-count">
            {filteredCompanies.length} matching companies
            {filteredCompanies.length ? `, showing ${pageStart + 1}-${pageEnd}` : ""}
          </p>
        </div>

        <div className="filters" aria-label="Leaderboard filters">
          <label>
            Search
            <input
              placeholder="Company, market, source..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label>
            Location
            <select value={location} onChange={(event) => setLocation(event.target.value)}>
              <option>All</option>
              {locations.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Source type
            <select value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
              <option>All</option>
              {sourceTypes.map((item) => (
                <option key={item} value={item}>
                  {sourceTypeLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Qualification
            <select value={qualification} onChange={(event) => setQualification(event.target.value)}>
              <option>All</option>
              {qualificationModes.map((item) => (
                <option key={item} value={item}>
                  {sourceTypeLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sort
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
              {Object.entries(sortLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Company</th>
                <th>Revenue/employee</th>
                <th>Annual revenue</th>
                <th>Team</th>
                <th>Website</th>
                <th>Source</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {visibleCompanies.map((company) => (
                <tr key={company.id}>
                  <td className="rank">{rankLabel(company.rank)}</td>
                  <td className="company-cell">
                    <Link href={`/companies/${company.id}`}>
                      {company.company}
                    </Link>
                    <span>{company.description || "AI-native company"}</span>
                  </td>
                  <td className="money strong">{company.revenuePerEmployee.display}</td>
                  <td className="money">{company.annualRevenue.display}</td>
                  <td>{company.employees ?? "Unknown"}</td>
                  <td>
                    {company.website ? (
                      <a className="table-link" href={company.website} target="_blank" rel="noreferrer">
                        Website
                      </a>
                    ) : (
                      <span className="muted">Unknown</span>
                    )}
                  </td>
                  <td>
                    {company.source ? (
                      <a className={`source-pill ${company.sourceType}`} href={company.source} target="_blank" rel="noreferrer">
                        {company.sourceLabel}
                      </a>
                    ) : (
                      <span className={`source-pill ${company.sourceType}`}>{company.sourceLabel}</span>
                    )}
                  </td>
                  <td>{company.lastUpdated || "Unknown"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pageCount > 1 ? (
          <div className="pagination">
            <button disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              Previous
            </button>
            <span>
              Page {currentPage} of {pageCount}
            </span>
            <button
              disabled={currentPage === pageCount}
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            >
              Next
            </button>
          </div>
        ) : null}
      </section>

      <section className="two-column">
        <article className="info-panel" id="sources">
          <p className="eyebrow">Sync model</p>
          <h2>Source receipts first.</h2>
          <p>
            `npm run sync:leaderboard` fetches the public CSV, normalizes money fields, keeps
            company markdown copy blocks aligned, and writes generated data into `data/companies.json`.
          </p>
          <ul>
            <li>{totals.publicSourceCount} rows currently use public-source receipts.</li>
            <li>Private or founder verification rows are labeled instead of over-claiming.</li>
            <li>Weekly feeds are generated into `feeds/YYYY/MM/YYYY-MM-DD.md`.</li>
          </ul>
        </article>

        <article className="info-panel">
          <p className="eyebrow">Study model</p>
          <h2>Start with the company.</h2>
          <p>
            Company names open the company website. Source labels remain visible so you can decide
            whether a metric is citation-ready, privately verified, or just a watchlist lead.
          </p>
        </article>
      </section>

      <section className="submit-section" id="submit">
        <div>
          <p className="eyebrow">Improve the radar</p>
          <h2>Submit a company or update.</h2>
        </div>
        <form className="quick-submit-form" onSubmit={submitTip}>
          <input type="hidden" name="submissionType" value="submit-company" />
          <label>
            Company
            <input name="title" required minLength={2} maxLength={120} />
          </label>
          <label>
            What changed?
            <textarea name="outcome" required minLength={10} maxLength={1200} />
          </label>
          <label>
            Source or context
            <textarea name="context" maxLength={1600} />
          </label>
          <label>
            Your handle or email
            <input name="handle" maxLength={120} />
          </label>
          <input name="website" className="honeypot" tabIndex={-1} autoComplete="off" />
          <button className="primary" disabled={formStatus === "submitting"}>
            {formStatus === "submitting" ? "Submitting..." : "Create issue"}
          </button>
          {formStatus === "success" ? <p className="form-note">Submission sent.</p> : null}
          {formStatus === "error" ? <p className="form-note error">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}
