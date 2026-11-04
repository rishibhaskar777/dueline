import { Diagram, K } from "./lib.mjs";

export function insideTheApp() {
  const d = new Diagram({
    slug: "inside-the-app",
    title: "Inside the Dueline app",
    desc: "The layers of the app from top to bottom: screens, the typed api-client, the proxy that checks the signed demo cookie, route handlers that validate every request, the modules in src/lib grouped by job, and the store, which is Postgres or memory. Outside systems sit on the right: PayPal, Gemini, ECB rates and Postgres. In offline mode a fake PayPal, a small parser and templates, saved rates and the in-memory store replace them. The animation walks one request down the layers to PayPal and the store, then back up to the screen.",
    height: 840,
    period: 20,
    heading: "INSIDE THE APP",
    sub: "One request, from a screen down to PayPal and the store, and back.",
  });
  const X = 40,
    W = 800;
  const layers = [
    [
      "l1",
      150,
      "Screens",
      "Client components: Home, Clients, New invoice, Nudges, Export, Fees and rates, Profile",
    ],
    [
      "l2",
      236,
      "api-client",
      "src/lib/api-client.ts: one typed function per endpoint, the only way to the server",
    ],
    ["l3", 322, "Proxy", "src/proxy.ts: checks the signed demo cookie, no database or PayPal call"],
    [
      "l4",
      408,
      "Route handlers",
      "src/app/api: zod on every body, one { error: { code, message } } shape",
    ],
  ];
  for (const [id, y, t, l] of layers) {
    d.card(id, X, y, W, 62, { kind: id === "l1" ? "plain" : "dueline", rx: 18 });
    d.words(id, X + 22, y + 26, t, { size: 17, weight: 800, fill: id === "l1" ? K.ink : "#fff" });
    d.words(id, X + 22, y + 48, l, { fill: id === "l1" ? K.mute : "#cfdcff" });
  }
  // modules
  d.card("l5", X, 494, W, 210, { kind: "plain", rx: 18 });
  d.words("l5", X + 22, 522, "Modules in src/lib, grouped by job", {
    size: 17,
    weight: 800,
    fill: K.ink,
  });
  const mods = [
    ["Money and rates", "money, rates, payouts"],
    ["PayPal", "paypal, invoices, requests"],
    ["AI and privacy", "ai, privacy, reminders"],
    ["Risk and export", "risk, export, insights, clients"],
    ["Automation", "automation, promises, demo"],
    ["Foundations", "env, clock, settings, profile"],
  ];
  mods.forEach(([t, l], i) => {
    const cx = X + 20 + (i % 3) * 254,
      cy = 542 + Math.floor(i / 3) * 80;
    d.chip("l5", `m${i}`, cx, cy, 242, 68, {
      kind: "outside",
      title: t,
      lines: [l],
      fill: K.paypalBg,
    });
  });
  d.card("l6", X, 728, W, 62, { kind: "dueline", rx: 18 });
  d.words("l6", X + 22, 754, "Store", { size: 17, weight: 800, fill: "#fff" });
  d.words("l6", X + 22, 776, "One interface: Postgres, or memory when no database is set", {
    fill: "#cfdcff",
  });

  // right: outside systems
  d.node("pp", 900, 494, 340, 62, {
    kind: "paypal",
    title: "PayPal",
    size: 17,
    pad: 20,
    lines: ["Invoicing v2, Payments, Transactions"],
  });
  d.node("ge", 900, 564, 340, 62, {
    kind: "violet",
    title: "Gemini",
    size: 17,
    pad: 20,
    lines: ["Masked chat in, draft out"],
  });
  d.node("ec", 900, 634, 340, 62, {
    kind: "plain",
    title: "ECB rates",
    size: 17,
    pad: 20,
    lines: ["Daily reference rates via Frankfurter"],
  });
  d.node("pg", 900, 728, 340, 62, {
    kind: "plain",
    title: "Postgres",
    size: 17,
    pad: 20,
    lines: ["Neon, one pooled connection string"],
  });

  // offline card
  d.card("off", 900, 150, 340, 320, { kind: "plain", rx: 22, dash: true });
  d.words("off", 922, 184, "Offline mode", { size: 19, weight: 800, fill: K.ink });
  d.words("off", 922, 208, "One switch swaps the four systems", { fill: K.mute });
  d.words("off", 922, 227, "below for code inside the app:", { fill: K.mute });
  [
    ["PayPal", "an in-memory fake"],
    ["Gemini", "a small parser and templates"],
    ["ECB rates", "the rates saved in settings"],
    ["Postgres", "the in-memory store"],
  ].forEach(([a, b], i) => {
    const y = 246 + i * 50;
    d.chip("off", `o${i}`, 922, y, 296, 42, {
      kind: "outside",
      title: a,
      lines: [],
      fill: K.greyBg,
    });
    d.words("off", 1010, y + 26, b, { fill: K.mute });
  });
  d.words("off", 922, 458, "The checks and the routes do not change.", { fill: K.mute });

  // arrows between layers: request goes down at x=770, answer comes up at x=808
  const gaps = [
    [212, "calls a typed function"],
    [298, "JSON over HTTPS"],
    [384, "cookie checked"],
    [470, "body validated, work handed on"],
    [704, "reads and writes"],
  ];
  gaps.forEach(([y, lab], i) => {
    const y2 = i === 4 ? 728 : y + 24;
    d.arrow(`M770 ${y} V${y2}`, { color: K.blue });
    d.arrow(`M808 ${y2} V${y}`, { color: K.green });
    d.label(64, y + 17, lab, { fill: K.navy });
  });
  d.arrow("M840 525 H900", { color: K.blue });
  d.arrow("M840 595 H900", { color: K.violet });
  d.arrow("M900 665 H840", { color: K.blue });
  d.arrow("M840 759 H900", { color: K.navy });

  const down = (y, y2) => `M770 ${y} V${y2}`;
  d.step({
    n: 1,
    color: K.blue,
    caption: "A screen calls a typed function in api-client",
    hl: [[X, 150, W, 62]],
    token: down(212, 236),
    badge: [748, 224],
  });
  d.step({
    n: 2,
    color: K.blue,
    caption: "The call goes to the server as JSON over HTTPS",
    hl: [[X, 236, W, 62]],
    token: down(298, 322),
    badge: [748, 310],
  });
  d.step({
    n: 3,
    color: K.blue,
    caption: "The proxy checks the signed cookie and lets the request through",
    hl: [[X, 322, W, 62]],
    token: down(384, 408),
    badge: [748, 396],
  });
  d.step({
    n: 4,
    color: K.blue,
    caption: "The route validates the body and hands the work to a module",
    hl: [[X, 408, W, 62]],
    token: down(470, 494),
    badge: [748, 482],
  });
  d.step({
    n: 5,
    color: K.violet,
    caption: "The module asks PayPal, Gemini or the rate service",
    hl: [
      [X + 274, 542, 242, 68],
      [900, 494, 340, 62],
    ],
    token: "M840 525 H900",
    badge: [862, 505],
  });
  d.step({
    n: 6,
    color: K.navy,
    caption: "It reads or writes the store, which is Postgres or memory",
    hl: [
      [X, 728, W, 62],
      [900, 728, 340, 62],
    ],
    token: "M770 704 V759 H900",
    badge: [748, 716],
  });
  d.step({
    n: 7,
    color: K.green,
    caption: "The answer climbs back, checked in code, as { ok } or { error }",
    hl: [[X, 408, W, 62]],
    token: "M808 494 V150",
    badge: [830, 482],
  });
  d.step({
    n: 8,
    color: K.green,
    caption: "api-client turns it into data or an error, and the screen draws it",
    hl: [[X, 150, W, 62]],
    token: "M808 236 V212",
    badge: [830, 224],
  });
  return d;
}
