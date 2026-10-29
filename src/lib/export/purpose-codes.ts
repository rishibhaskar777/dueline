import type { PurposeCode } from "@/types/export";

// Check this list against the Reserve Bank of India's current purpose codes before real use.
export const PURPOSE_CODES: readonly PurposeCode[] = [
  {
    code: "P0802",
    label: "Software consultancy and implementation",
    examples: "Custom software development, app builds, technical consulting",
  },
  {
    code: "P0807",
    label: "Off-site software exports",
    examples: "Software delivered from India to a client abroad, SaaS customisation",
  },
  {
    code: "P0803",
    label: "Data processing and database services",
    examples: "Data entry, data cleaning, database setup and hosting",
  },
  {
    code: "P0806",
    label: "Other information services",
    examples: "Research reports, content licensing, information retrieval",
  },
  {
    code: "P1006",
    label: "Business and management consultancy",
    examples: "Strategy advice, operations consulting, project management",
  },
  {
    code: "P1007",
    label: "Advertising, trade fair and digital marketing",
    examples: "Social media campaigns, ad creative, SEO, marketing kits",
  },
  {
    code: "P1016",
    label: "Market research",
    examples: "Surveys, competitor analysis, customer interviews",
  },
  {
    code: "P1004",
    label: "Legal services",
    examples: "Contract drafting, legal research, compliance review",
  },
  {
    code: "P1005",
    label: "Accounting, auditing and bookkeeping",
    examples: "Bookkeeping, tax preparation, financial statements",
  },
  {
    code: "P1099",
    label: "Other services not listed elsewhere",
    examples: "Design work with no closer match, such as logos, brand guidelines, pitch decks",
  },
];

export function isPurposeCode(value: string): boolean {
  return PURPOSE_CODES.some((entry) => entry.code === value);
}
