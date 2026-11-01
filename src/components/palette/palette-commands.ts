import type { ClientSummary, InvoiceSummary } from "@/types";

export type PaletteAction = { kind: "go"; href: string } | { kind: "toggle-theme" };

export interface PaletteCommand {
  id: string;
  label: string;
  keywords?: string;
  hint?: string;
  action: PaletteAction;
}

const PAGES = [
  { href: "/receivables", label: "Receivables", keywords: "dashboard home due line" },
  { href: "/clients", label: "Clients", keywords: "customers" },
  { href: "/invoices/new", label: "New invoice", keywords: "create paste chat" },
  { href: "/nudges", label: "Nudges", keywords: "reminders late chase" },
  { href: "/export", label: "Export register", keywords: "fira gst csv" },
  { href: "/profile", label: "Profile", keywords: "business gstin lut library items" },
  { href: "/settings", label: "Fees and rates", keywords: "settings alerts paypal" },
  { href: "/demo-tools", label: "Demo tools", keywords: "reset prepare" },
];

interface PaletteData {
  invoices: readonly InvoiceSummary[];
  clients: readonly ClientSummary[];
}

function remindable(invoice: InvoiceSummary): boolean {
  return invoice.dueState === "overdue" && invoice.paypalStatus !== "CANCELLED";
}

// Everything the palette can do. Pages and actions are always there; clients and invoices are
// added once they have loaded.
export function buildCommands({ invoices, clients }: PaletteData): PaletteCommand[] {
  return [
    ...PAGES.map(({ href, label, keywords }) => ({
      id: `page:${href}`,
      label: `Go to ${label}`,
      keywords,
      action: { kind: "go", href } as const,
    })),
    {
      id: "action:toggle-theme",
      label: "Toggle theme",
      keywords: "dark light mode",
      action: { kind: "toggle-theme" },
    },
    ...clients.map((client) => ({
      id: `client:${client.key}`,
      label: `Open client ${client.name}`,
      action: { kind: "go", href: `/clients/by-key/${encodeURIComponent(client.key)}` } as const,
    })),
    ...invoices.map((invoice) => ({
      id: `invoice:${invoice.id}`,
      label: `Open invoice ${invoice.number}`,
      keywords: invoice.client.name,
      hint: invoice.client.name,
      action: { kind: "go", href: `/invoices/${encodeURIComponent(invoice.id)}` } as const,
    })),
    ...invoices.filter(remindable).map((invoice) => ({
      id: `reminder:${invoice.id}`,
      label: `Draft a reminder for ${invoice.client.name}`,
      keywords: invoice.number,
      hint: invoice.number,
      action: { kind: "go", href: `/nudges#invoice-${encodeURIComponent(invoice.id)}` } as const,
    })),
  ];
}
