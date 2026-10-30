import type { PurposeCode } from "@/types/export";

// Reserve Bank of India purpose codes for inward remittances (services). Checked on 30 Oct 2026.
export const PURPOSE_CODES: readonly PurposeCode[] = [
  {
    code: "P0802",
    label: "Software consultancy and implementation",
    examples: "Custom software development, app builds, technical consulting",
  },
  {
    code: "P0803",
    label: "Database and data processing charges",
    examples: "Data entry, data cleaning, database setup and hosting",
  },
  {
    code: "P0806",
    label: "Other information services and subscriptions",
    examples: "Research reports, content licensing, information retrieval",
  },
  {
    code: "P0807",
    label: "Off-site software exports",
    examples: "Software delivered from India to a client abroad, SaaS customisation",
  },
  {
    code: "P1004",
    label: "Legal services",
    examples: "Contract drafting, legal research, compliance review",
  },
  {
    code: "P1005",
    label: "Accounting, auditing and bookkeeping services",
    examples: "Bookkeeping, tax preparation, financial statements",
  },
  {
    code: "P1006",
    label: "Business and management consultancy services",
    examples: "Strategy advice, operations consulting, project management",
  },
  {
    code: "P1007",
    label: "Advertising, trade fair and market research services",
    examples: "Social media campaigns, ad creative, SEO, marketing kits",
  },
  {
    code: "P1015",
    label: "Tax consulting services",
    examples: "Tax planning advice, GST and income tax consulting",
  },
  {
    code: "P1016",
    label: "Market research and public opinion polling services",
    examples: "Surveys, competitor analysis, customer interviews",
  },
  {
    code: "P1017",
    label: "Publishing and printing services",
    examples: "Book layout, editing and typesetting, newsletter production",
  },
  {
    code: "P1099",
    label: "Other services not included elsewhere",
    examples: "Design work with no closer match, such as logos, brand guidelines, pitch decks",
  },
];

export function isPurposeCode(value: string): boolean {
  return PURPOSE_CODES.some((entry) => entry.code === value);
}
