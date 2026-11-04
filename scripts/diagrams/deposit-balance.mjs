import { Diagram, K, poly } from "./lib.mjs";

export function depositBalance() {
  const d = new Diagram({
    slug: "deposit-balance",
    title: "Deposit and balance invoices",
    desc: "A chat that asks for part of the money upfront produces one draft with payment terms. Dueline splits the total in code: the deposit is the percentage rounded to the cent and the balance is the rest. The deposit invoice is created and sent now through PayPal. The balance invoice is saved as an unsent PayPal draft and appears in Ready to send on Home. When the freelancer clicks Send balance, the draft is re-dated to today, keeping its days to pay, and sent. The two amounts always add up to the job total.",
    height: 720,
    period: 20,
    heading: "DEPOSIT AND BALANCE INVOICES",
    sub: "Two ordinary invoices instead of a partial payment.",
  });
  const w = 208,
    xs = [40, 286, 532, 778, 1024];
  const T = 160,
    B = 350,
    h = 130;
  d.node("dr", xs[0], 210, w, 150, {
    kind: "plain",
    title: "One draft",
    size: 18,
    pad: 18,
    lines: ["From the chat: total", "$1,000, 50% now and", "the rest on delivery."],
  });
  d.node("sp", xs[1], 210, w, 150, {
    kind: "dueline",
    title: "Split in code",
    size: 18,
    pad: 18,
    lines: ["Deposit is the percent,", "rounded to the cent.", "Balance is the rest."],
  });
  d.node("de", xs[2], T, w, h, {
    kind: "paypal",
    title: "Deposit invoice",
    size: 18,
    pad: 18,
    lines: ["$500.00, one line.", "Created and sent now.", "Own request ID."],
  });
  d.node("cl", xs[3], T, w, h, {
    kind: "green",
    title: "Client pays it",
    size: 18,
    pad: 18,
    lines: ["On PayPal's page,", "like any invoice."],
  });
  d.node("ba", xs[2], B, w, h, {
    kind: "amber",
    title: "Balance invoice",
    size: 18,
    pad: 18,
    lines: ["$500.00, one line.", "Saved as a PayPal draft.", "Not sent."],
  });
  d.node("rs", xs[3], B, w, h, {
    kind: "dueline",
    title: "Ready to send",
    size: 18,
    pad: 18,
    lines: ["A widget on Home.", "Shows balance drafts", "and nothing else."],
  });
  d.card("sb", xs[4], B - 40, w, 210, { kind: "paypal", rx: 22 });
  d.words("sb", xs[4] + 18, B - 40 + 32, "Send balance", { size: 18, weight: 800, fill: K.navy });
  d.chip("sb", "sb1", xs[4] + 12, B - 40 + 50, w - 24, 66, {
    kind: "paypal",
    title: "1  Re-date",
    lines: ["Invoice date is today,", "days to pay kept."],
  });
  d.chip("sb", "sb2", xs[4] + 12, B - 40 + 128, w - 24, 66, {
    kind: "paypal",
    title: "2  Send",
    lines: ["PayPal sends it", "to the client."],
  });

  d.node("sum", 40, 560, 1200, 120, {
    kind: "plain",
    title: "The two always add up",
    size: 17,
    pad: 24,
    lines: [],
  });
  d.words("sum", 64, 626, "$500.00", { size: 30, weight: 800, fill: K.navy });
  d.words("sum", 208, 626, "deposit  +", { size: 15, weight: 700, fill: K.mute });
  d.words("sum", 316, 626, "$500.00", { size: 30, weight: 800, fill: K.amberDk });
  d.words("sum", 460, 626, "balance  =", { size: 15, weight: 700, fill: K.mute });
  d.words("sum", 568, 626, "$1,000.00", { size: 30, weight: 800, fill: K.greenDk });
  d.words(
    "sum",
    760,
    618,
    "Each is a complete invoice with its own SAC, purpose code and LUT line,",
    { fill: K.mute },
  );
  d.words("sum", 760, 640, "so the export register and GSTR-1 count each one once.", {
    fill: K.mute,
  });

  d.arrow(`M${xs[0] + w} 285 H${xs[1]}`, { color: K.blue });
  const toDep = poly(
    [
      [xs[1] + w, 255],
      [xs[1] + w + 19, 255],
      [xs[1] + w + 19, T + 65],
      [xs[2], T + 65],
    ],
    10,
  );
  const toBal = poly(
    [
      [xs[1] + w, 315],
      [xs[1] + w + 19, 315],
      [xs[1] + w + 19, B + 65],
      [xs[2], B + 65],
    ],
    10,
  );
  d.arrow(toDep, { color: K.blue });
  d.arrow(toBal, { color: K.amber });
  d.arrow(`M${xs[2] + w} ${T + 65} H${xs[3]}`, { color: K.green });
  d.arrow(`M${xs[2] + w} ${B + 65} H${xs[3]}`, { color: K.amber });
  d.arrow(`M${xs[3] + w} ${B + 65} H${xs[4]}`, { color: K.blue });

  const bx = (i) => xs[i] + w - 26;
  d.step({
    n: 1,
    color: K.blue,
    caption: "The chat asks for 50% now, so the form offers a deposit",
    hl: [[xs[0], 210, w, 150]],
    token: `M${xs[0] + w} 285 H${xs[1]}`,
    badge: [bx(0), 236],
  });
  d.step({
    n: 2,
    color: K.navy,
    caption: "Dueline splits the total in code. The balance is the rest",
    hl: [[xs[1], 210, w, 150]],
    token: toDep,
    badge: [bx(1), 236],
  });
  d.step({
    n: 3,
    color: K.blue,
    caption: "The deposit invoice is created and sent now",
    hl: [[xs[2], T, w, h]],
    token: `M${xs[2] + w} ${T + 65} H${xs[3]}`,
    badge: [bx(2), T + 26],
  });
  d.step({
    n: 4,
    color: K.amber,
    caption: "The balance is saved as a PayPal draft under its own request ID",
    hl: [[xs[2], B, w, h]],
    token: toBal,
    badge: [bx(2), B + 26],
  });
  d.step({
    n: 5,
    color: K.amber,
    caption: "The draft waits in Ready to send on Home",
    hl: [[xs[3], B, w, h]],
    token: `M${xs[2] + w} ${B + 65} H${xs[3]}`,
    badge: [bx(3), B + 26],
  });
  d.step({
    n: 6,
    color: K.blue,
    caption: "On delivery, Send balance re-dates the draft to today",
    hl: [[xs[4] + 12, B + 10, w - 24, 66]],
    token: `M${xs[3] + w} ${B + 65} H${xs[4]}`,
    badge: [bx(4), B - 14],
  });
  d.step({
    n: 7,
    color: K.green,
    caption: "PayPal sends it. Deposit plus balance equals the job total",
    hl: [
      [xs[4] + 12, B + 88, w - 24, 66],
      [40, 560, 1200, 120],
    ],
    badge: [bx(4), B + 100],
  });
  return d;
}
