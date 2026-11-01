export function mergeSentence(
  from: { name: string; email: string },
  into: { name: string },
): string {
  return `Invoices from ${from.name} (${from.email}) will count as ${into.name} for risk, totals and reminders. PayPal invoices are not changed.`;
}
