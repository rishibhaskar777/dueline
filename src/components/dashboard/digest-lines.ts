import { describeTriggered } from "@/lib/automation/rate-alerts";
import { formatMoney } from "@/lib/money/format";
import type { DailyDigest, DigestInvoice } from "@/types";

export interface DigestLine {
  key: string;
  label: string;
  text: string;
  tone?: "paid" | "late" | "due-soon";
  href?: string;
}

const SHOWN = 3;

function names(invoices: DigestInvoice[]): string {
  const shown = invoices
    .slice(0, SHOWN)
    .map(
      ({ clientName, invoiceNumber, amount }) =>
        `Invoice ${invoiceNumber} · ${clientName} (${formatMoney(amount)})`,
    );
  const more = invoices.length - SHOWN;
  return more > 0 ? `${shown.join(", ")} and ${more} more` : shown.join(", ");
}

// Only what has something to say gets a line, so a quiet morning is a short card.
export function digestLines(digest: DailyDigest): DigestLine[] {
  const lines: DigestLine[] = [];
  if (digest.paidSinceYesterday.length > 0) {
    lines.push({
      key: "paid",
      label: "Paid since yesterday",
      text: names(digest.paidSinceYesterday),
      tone: "paid",
    });
  }
  if (digest.newlyOverdue.length > 0) {
    lines.push({
      key: "overdue",
      label: "Newly overdue",
      text: names(digest.newlyOverdue),
      tone: "late",
    });
  }
  if (digest.dueSoon.length > 0) {
    lines.push({
      key: "due",
      label: "Due in the next 3 days",
      text: names(digest.dueSoon),
      tone: "due-soon",
    });
  }
  if (digest.preparedDrafts > 0) {
    const count = digest.preparedDrafts;
    lines.push({
      key: "drafts",
      label: "Prepared for you",
      text: `${count} ${count === 1 ? "draft is" : "drafts are"} ready to review under Nudges.`,
      href: "/nudges",
    });
  }
  digest.rateAlerts.forEach((alert) => {
    lines.push({
      key: `alert-${alert.currency}-${alert.direction}-${alert.threshold}`,
      label: "Rate alert",
      text: describeTriggered(alert),
    });
  });
  return lines;
}
