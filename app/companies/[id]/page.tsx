import Link from "next/link";
import { notFound } from "next/navigation";
import { findCompany, formatCompactCurrency, companies, sourceTypeLabel } from "@/lib/companies";

type Props = {
  params: Promise<{ id: string }>;
};

function rankLabel(rank: number) {
  return rank >= 9999 ? "Watchlist" : `#${rank}`;
}

function companyMarkdown(company: NonNullable<ReturnType<typeof findCompany>>) {
  return `# ${company.company}

Description: ${company.description}
Location: ${company.location}
Rank: ${rankLabel(company.rank)}

Revenue per employee: ${company.revenuePerEmployee.display}
Annual revenue: ${company.annualRevenue.display}
Employees: ${company.employees ?? "Unknown"}
Profitable: ${company.profitable}
Total funding: ${company.totalFunding.display}
Valuation: ${company.valuation.display}
Valuation per employee: ${company.valuationPerEmployee.display}
Founded: ${company.founded ?? "Unknown"}

Source: ${company.sourceLabel}
Source type: ${sourceTypeLabel(company.sourceType)}
Source URL: ${company.source || "No public source URL listed"}
Website: ${company.website || "No website listed"}
Last updated: ${company.lastUpdated || "Unknown"}
Qualification: ${company.qualification}
`;
}

export function generateStaticParams() {
  return companies.map((company) => ({ id: company.id }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const company = findCompany(id);

  if (!company) {
    return { title: "Company not found | AI Leaderboard Radar" };
  }

  return {
    title: `${company.company} | AI Leaderboard Radar`,
    description: `${company.company}: ${company.revenuePerEmployee.display} revenue per employee with ${company.sourceLabel.toLowerCase()} receipt context.`,
  };
}

export default async function CompanyPage({ params }: Props) {
  const { id } = await params;
  const company = findCompany(id);

  if (!company) {
    notFound();
  }

  const markdown = companyMarkdown(company);

  return (
    <main className="detail-shell">
      <Link className="back-link" href="/">
        Back to leaderboard
      </Link>

      <section className="detail-hero">
        <p className="eyebrow">{company.qualification}</p>
        <h1>{company.company}</h1>
        <p>{company.description}</p>
        <div className="detail-grid">
          <div className="detail-stat">
            <span>Rank</span>
            <strong>{rankLabel(company.rank)}</strong>
          </div>
          <div className="detail-stat">
            <span>Revenue/employee</span>
            <strong>{company.revenuePerEmployee.display}</strong>
          </div>
          <div className="detail-stat">
            <span>Annual revenue</span>
            <strong>{company.annualRevenue.display}</strong>
          </div>
          <div className="detail-stat">
            <span>Team</span>
            <strong>{company.employees ?? "Unknown"}</strong>
          </div>
        </div>
      </section>

      <section className="detail-hero">
        <p className="eyebrow">Study Notes</p>
        <div className="detail-grid">
          <div className="detail-stat">
            <span>Location</span>
            <strong>{company.location}</strong>
          </div>
          <div className="detail-stat">
            <span>Profitability</span>
            <strong>{company.profitable}</strong>
          </div>
          <div className="detail-stat">
            <span>Funding</span>
            <strong>{company.totalFunding.display}</strong>
          </div>
          <div className="detail-stat">
            <span>Valuation/employee</span>
            <strong>{formatCompactCurrency(company.valuationPerEmployee.value)}</strong>
          </div>
        </div>
        <div className="detail-actions">
          {company.website && (
            <a href={company.website} target="_blank" rel="noreferrer">
              Company website
            </a>
          )}
          {company.source && (
            <a href={company.source} target="_blank" rel="noreferrer">
              Source receipt
            </a>
          )}
        </div>
      </section>

      <section className="markdown-panel">
        <p className="eyebrow">Copyable Markdown</p>
        <pre className="markdown-recipe">
          <code>{markdown}</code>
        </pre>
      </section>
    </main>
  );
}
