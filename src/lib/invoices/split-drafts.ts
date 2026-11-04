import { ADDED_LINES_ROOM, NOTE_LIMIT } from "@/lib/paypal/invoice-body";
import { formatMoney } from "@/lib/money/format";
import { fromMinorUnits, toMinorUnits } from "@/lib/money/decimal";
import { splitTotal } from "@/lib/money/split";
import type { CreateSplitRequest, Money } from "@/types";

type DraftToCreate = CreateSplitRequest["draft"];

export interface SplitPlan {
  percent: number;
  deposit: Money;
  balance: Money;
}

// PayPal's limit for an item name is 200 characters.
const NAME_LIMIT = 200;
const SENTENCE_LIMIT = 3000;

export function itemsTotalMinor(draft: DraftToCreate): number {
  return draft.items.reduce((sum, item) => sum + item.quantity * toMinorUnits(item.unitAmount), 0);
}

export function planSplit(draft: DraftToCreate, percent: number): SplitPlan | null {
  const amounts = splitTotal(itemsTotalMinor(draft), percent);
  if (!amounts) return null;
  const money = (minor: number): Money => ({
    currency: draft.currency,
    value: fromMinorUnits(minor),
  });
  return { percent, deposit: money(amounts.depositMinor), balance: money(amounts.balanceMinor) };
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

// The item names after the prefix, as many as fit, then "and 2 more" for the rest.
function workList(names: string[], room: number): string {
  const all = names.join(", ");
  if (all.length <= room) return all;
  for (let shown = names.length - 1; shown >= 1; shown -= 1) {
    const text = `${names.slice(0, shown).join(", ")} and ${names.length - shown} more`;
    if (text.length <= room) return text;
  }
  return clip(names[0] ?? "", room);
}

function lineName(label: string, percent: number, draft: DraftToCreate): string {
  const prefix = `${label} (${percent}%) for: `;
  return `${prefix}${workList(
    draft.items.map((item) => item.name),
    NAME_LIMIT - prefix.length,
  )}`;
}

function singleLine(
  draft: DraftToCreate,
  name: string,
  amount: Money,
  dueOn: string,
  note: string | undefined,
): DraftToCreate {
  return {
    ...draft,
    dueOn,
    items: [{ name, quantity: 1, unitAmount: amount.value, sac: draft.items[0]?.sac ?? null }],
    note,
  };
}

export function depositDraft(draft: DraftToCreate, plan: SplitPlan, dueOn: string): DraftToCreate {
  return singleLine(
    draft,
    lineName("Deposit", plan.percent, draft),
    plan.deposit,
    dueOn,
    draft.note,
  );
}

// The balance carries what the client needs to match it to the deposit and the whole job, without
// a negative line or a discount: it is a complete invoice for its own value.
export function balanceDraft(
  draft: DraftToCreate,
  plan: SplitPlan,
  dueOn: string,
  depositNumber: string,
): DraftToCreate {
  const money = (item: DraftToCreate["items"][number]): string =>
    `${item.name} (${item.quantity} × ${formatMoney({ currency: draft.currency, value: item.unitAmount })})`;
  // The freelancer's own note and the lines added after it (LUT, early payment) share PayPal's 4,000.
  const room = NOTE_LIMIT - ADDED_LINES_ROOM - (draft.note ? draft.note.length + 1 : 0);
  const sentence = clip(
    `Deposit of ${formatMoney(plan.deposit)} invoiced on ${depositNumber}. Full work: ${draft.items.map(money).join(", ")}.`,
    Math.min(SENTENCE_LIMIT, room),
  );
  const note = [draft.note, sentence].filter(Boolean).join("\n");
  return singleLine(
    draft,
    lineName("Balance", 100 - plan.percent, draft),
    plan.balance,
    dueOn,
    note,
  );
}
