import companiesData from "@/data/companies.json";

export type MoneyValue = {
  display: string;
  value: number | null;
};

export type AiCompany = {
  id: string;
  rank: number;
  company: string;
  description: string;
  location: string;
  annualRevenue: MoneyValue;
  employees: number | null;
  revenuePerEmployee: MoneyValue;
  profitable: "Yes" | "No" | "Unknown";
  monthsToArr: number | null;
  totalFunding: MoneyValue;
  valuation: MoneyValue;
  valuationPerEmployee: MoneyValue;
  founded: number | null;
  lastUpdated: string;
  source: string;
  sourceLabel: string;
  sourceType: "public" | "founder-verification" | "private-verification" | "unknown";
  website: string;
  qualification: "qualifies" | "exception" | "watchlist";
};

export const companies = companiesData as AiCompany[];

export const locations = Array.from(
  new Set(companies.map((company) => company.location).filter(Boolean)),
).sort((left, right) => left.localeCompare(right));

export const sourceTypes = Array.from(new Set(companies.map((company) => company.sourceType))).sort();

export const qualificationModes = Array.from(
  new Set(companies.map((company) => company.qualification)),
).sort();

export const totals = {
  companyCount: companies.length,
  totalRevenue: companies.reduce((sum, company) => sum + (company.annualRevenue.value || 0), 0),
  medianEmployees: median(companies.map((company) => company.employees).filter(isNumber)),
  averageRevenuePerEmployee: average(
    companies.map((company) => company.revenuePerEmployee.value).filter(isNumber),
  ),
  onePersonCount: companies.filter((company) => company.employees === 1).length,
  publicSourceCount: companies.filter((company) => company.sourceType === "public").length,
};

function isNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return Math.round((sorted[midpoint - 1] + sorted[midpoint]) / 2);
  }

  return sorted[midpoint];
}

export function formatCompactCurrency(value: number | null) {
  if (!value) return "Unknown";

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: value >= 1_000_000_000 ? 1 : 0,
    notation: "compact",
    style: "currency",
  }).format(value);
}

export function findCompany(id: string) {
  return companies.find((company) => company.id === id);
}
