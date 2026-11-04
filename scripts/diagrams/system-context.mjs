import { Diagram, K, poly } from "./lib.mjs";

export function systemContext() {
  const d = new Diagram({
    slug: "system-context",
    title: "Dueline system context",
    desc: "The freelancer uses Dueline in a browser and gives the CA export files. A scheduler calls Dueline every morning at 06:00 India time. Dueline creates, sends and reminds invoices through PayPal Invoicing v2, reads fees and net amounts from PayPal Payments and Transaction Search, and receives signed PayPal webhooks. The client opens the invoice on PayPal's own checkout page and pays there. Dueline sends masked chats to Gemini, keeps its state in Postgres and reads European Central Bank rates through Frankfurter. The animation follows one invoice in ten steps from the freelancer's approval to the CSV file for the CA.",
    height: 830,
    period: 24,
    heading: "SYSTEM CONTEXT",
    sub: "Who uses Dueline and which outside systems it talks to. PayPal sandbox only.",
  });

  d.node("fl", 40, 150, 220, 100, {
    kind: "plain",
    title: "Freelancer",
    lines: ["Browser or phone", "Approves every send"],
  });
  d.node("ca", 40, 300, 220, 90, {
    kind: "plain",
    title: "CA",
    lines: ["Chartered accountant", "Receives the CSV files"],
  });
  d.node("sc", 40, 420, 220, 100, {
    kind: "amber",
    title: "Scheduler",
    lines: ["Vercel cron, every day", "at 06:00 India time"],
  });
  d.node("cl", 40, 650, 220, 110, {
    kind: "green",
    title: "Client abroad",
    lines: ["Opens the PayPal invoice", "and pays by card or balance"],
  });

  d.card("du", 400, 150, 400, 350, { kind: "dueline", rx: 26 });
  d.words("du", 428, 190, "Dueline", { size: 22, weight: 800, fill: "#fff" });
  d.words("du", 428, 212, "Next.js 16 on Vercel", { fill: "#cfdcff" });
  const chips = [
    ["Screens", "Home, Clients, New invoice, Nudges, Export"],
    ["Route handlers", "Validated, idempotent, one error shape"],
    ["Checks in code", "Money, masking, quotes, risk, purpose codes"],
    ["Morning run", "Prepares drafts and a queue, never sends"],
  ];
  chips.forEach(([t, l], i) =>
    d.chip("du", `duc${i}`, 424, 232 + i * 64, 352, 54, { kind: "dueline", title: t, lines: [l] }),
  );

  d.node("pg", 400, 570, 126, 100, {
    kind: "plain",
    title: "Postgres",
    size: 17,
    pad: 16,
    lines: ["Neon, or in", "memory"],
  });
  d.node("ge", 537, 570, 126, 100, {
    kind: "violet",
    title: "Gemini",
    size: 17,
    pad: 16,
    lines: ["Drafts from", "masked chats"],
  });
  d.node("ec", 674, 570, 126, 100, {
    kind: "plain",
    title: "ECB rates",
    size: 17,
    pad: 16,
    lines: ["Via Frankfurter,", "once a day"],
  });

  d.card("pp", 960, 150, 280, 330, { kind: "paypal", rx: 26 });
  d.words("pp", 984, 190, "PayPal sandbox", { size: 20, weight: 800, fill: K.navy });
  d.words("pp", 984, 212, "OAuth 2.0 · 14 API calls", { fill: K.mute });
  d.chip("pp", "ppi", 984, 228, 232, 70, {
    kind: "paypal",
    title: "Invoicing v2",
    lines: ["Create, send, remind, cancel,", "record payment, read"],
  });
  d.chip("pp", "ppp", 984, 310, 232, 70, {
    kind: "paypal",
    title: "Payments + Transactions",
    lines: ["Captures, the real fee", "and net amount"],
  });
  d.chip("pp", "ppw", 984, 392, 232, 70, {
    kind: "paypal",
    title: "Webhooks",
    lines: ["Signed events when an", "invoice changes"],
  });
  d.node("co", 960, 540, 280, 118, {
    kind: "green",
    title: "PayPal checkout page",
    size: 18,
    lines: ["Hosted by PayPal.", "Dueline never sees a card", "or bank number."],
  });

  // arrows
  d.arrow("M260 200 H400", { color: K.blue, label: "HTTPS", lx: 332, ly: 190, anchor: "middle" });
  d.arrow("M400 224 H260", { color: K.blue, rev: false });
  d.arrow("M150 250 V300", { color: K.navy, label: "CSV files", lx: 162, ly: 281 });
  d.arrow("M260 470 H400", {
    color: K.amber,
    labelFill: K.amberDk,
    label: "morning run",
    lx: 330,
    ly: 460,
    anchor: "middle",
  });
  d.arrow("M592 500 V570", { color: K.violet, labelFill: K.violetDk });
  d.arrow("M608 570 V500", { color: K.violet, labelFill: K.violetDk });
  d.label(624, 540, "masked chat", { fill: K.violetDk });
  d.arrow("M455 500 V570", { color: K.navy });
  d.arrow("M471 570 V500", { color: K.navy });
  d.label(487, 540, "state", { fill: K.navy });
  d.arrow("M737 570 V500", { color: K.blue });
  d.label(749, 540, "rates", { fill: K.navy });
  d.arrow("M800 266 H984", { color: K.blue, label: "create, send, remind", lx: 810, ly: 256 });
  d.arrow("M984 345 H800", { color: K.blue, label: "fee and net", lx: 810, ly: 335 });
  d.arrow("M984 427 H800", {
    color: K.green,
    labelFill: K.greenDk,
    label: "signed events",
    lx: 810,
    ly: 417,
  });
  const clientPath = poly(
    [
      [260, 705],
      [330, 705],
      [330, 790],
      [930, 790],
      [930, 599],
      [960, 599],
    ],
    16,
  );
  d.arrow(clientPath, {
    color: K.green,
    labelFill: K.greenDk,
    slow: true,
    label: "opens the invoice and pays on PayPal's page",
    lx: 348,
    ly: 780,
  });

  // story
  const S = (o) => d.step(o);
  S({
    n: 1,
    color: K.blue,
    caption: "The freelancer pastes a client chat and approves a draft",
    hl: [
      [40, 150, 220, 100],
      [400, 150, 400, 350],
    ],
    token: "M260 200 H400",
    badge: [284, 176],
  });
  S({
    n: 2,
    color: K.violet,
    caption: "Dueline sends the chat to Gemini with contacts masked",
    hl: [[537, 570, 126, 100]],
    token: "M592 500 V570",
    badge: [570, 535],
  });
  S({
    n: 3,
    color: K.blue,
    caption: "Dueline creates and sends the invoice through PayPal Invoicing v2",
    hl: [[984, 228, 232, 70]],
    token: "M800 266 H984",
    badge: [830, 232],
  });
  S({
    n: 4,
    color: K.green,
    caption: "The client opens the invoice and pays on PayPal's own page",
    hl: [
      [40, 650, 220, 110],
      [960, 540, 280, 118],
    ],
    token: clientPath,
    badge: [300, 740],
  });
  S({
    n: 5,
    color: K.green,
    caption: "PayPal sends a signed webhook and Dueline verifies it",
    hl: [[984, 392, 232, 70]],
    token: "M984 427 H800",
    badge: [830, 454],
  });
  S({
    n: 6,
    color: K.blue,
    caption: "Dueline reads PayPal's real fee and net amount",
    hl: [[984, 310, 232, 70]],
    token: "M984 345 H800",
    badge: [830, 372],
  });
  S({
    n: 7,
    color: K.blue,
    caption: "Dueline reads the ECB rate to show the rupees",
    hl: [[674, 570, 126, 100]],
    token: "M737 570 V500",
    badge: [782, 518],
  });
  S({
    n: 8,
    color: K.navy,
    caption: "Dueline stores the invoice snapshot and payout in Postgres",
    hl: [[400, 570, 126, 100]],
    token: "M455 500 V570",
    badge: [432, 535],
  });
  S({
    n: 9,
    color: K.amber,
    caption: "Every morning the scheduler starts the morning run",
    hl: [[40, 420, 220, 100]],
    token: "M260 470 H400",
    badge: [284, 446],
  });
  S({
    n: 10,
    color: K.navy,
    caption: "The freelancer sends the CSV files to the CA",
    hl: [[40, 300, 220, 90]],
    token: "M150 250 V300",
    badge: [232, 275],
  });
  return d;
}
