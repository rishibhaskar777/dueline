import { Diagram, K } from "./lib";

export function draftFromChat() {
  const d = new Diagram({
    slug: "draft-from-chat",
    title: "Drafting an invoice from a chat",
    desc: "A pasted chat of up to 6,000 characters has its emails and phone numbers masked in code. The masked chat goes to Gemini, which returns a structured draft with a quote for every item. Code then checks the draft: quotes are in the chat, prices appear in their quote, the due date is real and not in the past, the currency is supported, the purpose code is on the fixed list, payment terms are quoted and between 1 and 99 percent, and injection phrases are flagged. A price the chat does not contain is kept with a warning, never silently fixed. The result opens in the review form. Nothing is created or sent until the freelancer clicks.",
    height: 790,
    period: 20,
    heading: "DRAFTING AN INVOICE FROM A CHAT",
    sub: "The model proposes. Code decides. Nothing is created without a click.",
  });
  const top = 150;
  d.node("s1", 40, top, 200, 130, {
    kind: "plain",
    title: "Pasted chat",
    size: 18,
    pad: 18,
    lines: ["Up to 6,000 characters.", "Text in it is data, never", "instructions."],
  });
  d.node("s2", 280, top, 200, 130, {
    kind: "plain",
    title: "Mask contacts",
    size: 18,
    pad: 18,
    lines: ["Emails and phones become", "[EMAIL_1] and [PHONE_1]", "before any model call."],
  });
  d.node("s3", 520, top, 200, 130, {
    kind: "violet",
    title: "Gemini",
    size: 18,
    pad: 18,
    lines: ["A structured draft. Each", "item carries a quote from", "the chat."],
  });
  d.card("s4", 760, top, 270, 392, { kind: "dueline", rx: 24 });
  d.words("s4", 782, top + 34, "Checks in code", { size: 19, weight: 800, fill: "#fff" });
  d.words("s4", 782, top + 56, "Every field, against the chat", { fill: "#cfdcff" });
  const checks = [
    "Quotes are in the chat",
    "Prices are in their quote",
    "Due date is real, not past",
    "Currency is supported",
    "Purpose code is on the list",
    "Payment terms quoted, 1 to 99%",
    "Injection phrases flagged",
  ];
  checks.forEach((c, i) => {
    const y = top + 72 + i * 44;
    d.card(`c${i}`, 782, y, 226, 36, { kind: "plain", rx: 12, shadow: false });
    d.cards.pop();
    d.cards.push(
      `<rect data-id="c${i}" x="782" y="${y}" width="226" height="36" rx="12" fill="#ffffff" fill-opacity=".09"/>`,
    );
    d.words(`c${i}`, 796, y + 23, c, { size: 13.5, fill: "#ffffff" });
  });
  d.node("s5", 1070, top, 170, 150, {
    kind: "plain",
    title: "Review form",
    size: 18,
    pad: 16,
    lines: ["A draft, not an", "invoice. Totals are", "recalculated. Warnings", "show as pills."],
  });

  // example panel
  d.card("ex", 40, 330, 680, 212, { kind: "plain", rx: 22 });
  d.words("ex", 64, 362, "Example: the model misreads a price", {
    size: 17,
    weight: 800,
    fill: K.ink,
  });
  d.chip("ex", "ea", 64, 402, 200, 108, {
    kind: "outside",
    title: "Model's item",
    lines: ["Logo pack, 1 x $9,000", "Quote: “logo pack for", "900 dollars”"],
    fill: K.violetBg,
  });
  d.chip("ex", "eb", 308, 402, 170, 108, {
    kind: "outside",
    title: "Code checks",
    lines: ["9,000 is not a number", "in its own quote."],
    fill: K.redBg,
    titleFill: K.red,
  });
  d.chip("ex", "ec", 522, 402, 174, 108, {
    kind: "outside",
    title: "Review form",
    lines: ["Logo pack, $9,000", "Warning: check the", "price of 'Logo pack'"],
    fill: K.amberBg,
    titleFill: K.amberDk,
  });
  d.arrow("M264 456 H308", { color: K.violet, over: true });
  d.arrow("M478 456 H522", { color: K.amber, over: true });

  d.node("gd", 40, 586, 1200, 160, {
    kind: "plain",
    title: "Around the model",
    size: 17,
    pad: 24,
    lines: [],
  });
  const guards = [
    [
      "Cache",
      "The masked chat and today's date make the key. A stored answer is used for 24 hours with no model call.",
    ],
    [
      "Allowance",
      "10 extractions an hour per address, 400 model calls a day for the app. Over the limit is 429 or 503.",
    ],
    [
      "Fallback",
      "A 429, a 5xx, a timeout or a network failure moves to the second model once. A bad answer does not.",
    ],
  ];
  guards.forEach(([t, l], i) => {
    const x = 64 + i * 392;
    d.words("gd", x, 650, t, { size: 15, weight: 700, fill: K.navy });
    const words = l.split(" ");
    let line = "",
      row = 0;
    for (const w of words) {
      if ((line + " " + w).trim().length > 46) {
        d.words("gd", x, 672 + row * 19, line.trim(), {});
        row++;
        line = w;
      } else line += " " + w;
    }
    d.words("gd", x, 672 + row * 19, line.trim(), {});
  });

  d.arrow("M240 215 H280", { color: K.blue });
  d.arrow("M480 215 H520", { color: K.violet });
  d.arrow("M720 215 H760", { color: K.violet });
  d.arrow("M1030 215 H1070", { color: K.green });

  d.extras.push((dd) => {
    const [a4, b4] = dd.window(3),
      [a5, b5] = dd.window(4);
    const flag = (
      a: number,
      b: number,
      x: number,
      y: number,
      w: number,
      text: string,
      fill: string,
      stroke: string,
      color: string,
    ): string =>
      `<g class="anim" opacity="0">${dd.show(a, b)}<rect x="${x}" y="${y}" width="${w}" height="28" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="2"/><text x="${x + w / 2}" y="${y + 19}" text-anchor="middle" font-size="13" font-weight="800" fill="${color}">${text}</text></g>`;
    return (
      flag(a4, b4, 318, 372, 150, "Rejected: $9,000", K.redBg, K.red, K.red) +
      flag(a5, b5, 536, 372, 146, "Warning kept", K.amberBg, K.amber, K.amberDk)
    );
  });

  d.step({
    n: 1,
    color: K.blue,
    caption: "The freelancer pastes a chat of up to 6,000 characters",
    hl: [[40, top, 200, 130]],
    token: "M240 215 H280",
    badge: [262, 178],
  });
  d.step({
    n: 2,
    color: K.blue,
    caption: "Code replaces emails and phone numbers with placeholders",
    hl: [[280, top, 200, 130]],
    token: "M480 215 H520",
    badge: [502, 178],
  });
  d.step({
    n: 3,
    color: K.violet,
    caption: "Gemini returns a draft with a quote for every item",
    hl: [[520, top, 200, 130]],
    token: "M720 215 H760",
    badge: [742, 178],
  });
  d.step({
    n: 4,
    color: K.red,
    caption: "Code checks each field. A price that is not in the chat is rejected",
    hl: [
      [760, top, 270, 392],
      [308, 402, 170, 108],
    ],
    token: "M264 456 H308",
    badge: [1006, 186],
  });
  d.step({
    n: 5,
    color: K.amber,
    caption: "The price stays, with a warning for the freelancer to check",
    hl: [[522, 402, 174, 108]],
    token: "M478 456 H522",
    badge: [690, 358],
  });
  d.step({
    n: 6,
    color: K.green,
    caption: "The draft opens in the review form. Nothing is created yet",
    hl: [[1070, top, 170, 150]],
    token: "M1030 215 H1070",
    badge: [1050, 178],
  });
  return d;
}
