import { Diagram, K, type Rect } from "./lib";

export function dataAndSnapshot() {
  const d = new Diagram({
    slug: "data-and-snapshot",
    title: "Data and the invoice snapshot",
    desc: "Twenty-one Postgres tables in four groups: tables that make requests safe to repeat and verify, tables for money, rates and caches, tables for clients and follow-up, and tables for the demo and housekeeping. PayPal's invoices are kept as a snapshot in the cache_entries table. A read is answered from the snapshot at once. If the snapshot is older than 60 seconds a refresh runs behind the response: it lists the invoices at PayPal and reads in full only the new or changed ones. A write such as create, send, cancel, a recorded payment or a webhook refreshes the named invoices before it answers.",
    height: 870,
    period: 20,
    heading: "DATA AND THE INVOICE SNAPSHOT",
    sub: "PayPal holds the invoices. Dueline keeps small records and one snapshot.",
  });
  const cols: [number, string, string, [string, string][]][] = [
    [
      40,
      "Safe to repeat and verify",
      K.blue,
      [
        ["idempotency_requests", "request id, hash, status, result"],
        ["webhook_events", "event id, received at"],
        ["rate_limits", "key, window start, count"],
        ["activity_events", "kind, invoice, at, amount"],
        ["reminder_log", "invoice, tone, sent at"],
      ],
    ],
    [
      345,
      "Money, rates and caches",
      K.greenDk,
      [
        ["cache_entries", "key, value, expires at"],
        ["actual_payouts", "invoice, PayPal's payout figures"],
        ["exchange_rates", "currency, date, rate"],
        ["bank_receipts", "invoice, FIRC or e-BRC reference"],
        ["settings", "fees, rates source, reminders"],
        ["profile", "name, GSTIN, LUT, SAC, sign-off"],
      ],
    ],
    [
      650,
      "Clients and follow-up",
      K.violetDk,
      [
        ["client_notes", "client, notes, language"],
        ["client_aliases", "a client merged into another"],
        ["payment_promises", "invoice, promised date, note"],
        ["queue_items", "day, item, dismissed"],
        ["repeat_schedules", "monthly repeat invoices"],
        ["library_items", "saved line items"],
      ],
    ],
    [
      955,
      "Demo and housekeeping",
      K.amberDk,
      [
        ["demo_generation", "generation, seeded on"],
        ["demo_hidden_invoices", "invoice, hidden at"],
        ["app_flags", "name, set at"],
        ["schema_migrations", "name, applied at"],
      ],
    ],
  ];
  for (const [x, title, color, tables] of cols) {
    d.label(x, 160, title.toUpperCase(), { fill: color });
    tables.forEach(([name, fields], i) => {
      const id = `t_${name}`;
      d.card(id, x, 176 + i * 62, 285, 54, { kind: "plain", rx: 14 });
      if (name === "cache_entries")
        d.cards.push(
          `<rect x="${x}" y="${176 + i * 62}" width="285" height="54" rx="14" fill="none" stroke="${K.green}" stroke-width="3"/>`,
        );
      d.words(id, x + 16, 176 + i * 62 + 23, name, { size: 15, weight: 700, fill: K.ink });
      d.words(id, x + 16, 176 + i * 62 + 43, fields, { fill: K.mute });
    });
  }
  d.note(345, 570, "Highlighted: the snapshot lives here, under one versioned key.", {
    fill: K.greenDk,
    size: 13.5,
    weight: 700,
  });

  // snapshot panel
  const Y = 650,
    H = 110;
  d.label(40, 620, "THE INVOICE SNAPSHOT, STALE WHILE REVALIDATE", { fill: K.navy });
  d.node("bw", 40, Y, 180, H, {
    kind: "plain",
    title: "Browser",
    size: 18,
    pad: 20,
    lines: ["Home, Nudges,", "Clients"],
  });
  d.node("rt", 300, Y, 220, H, {
    kind: "dueline",
    title: "Route handler",
    size: 18,
    pad: 20,
    lines: ["Works out due states", "with today's date"],
  });
  d.node("st", 610, Y, 250, H, {
    kind: "plain",
    title: "cache_entries",
    size: 18,
    pad: 20,
    lines: ["Snapshot of every", "invoice, plus payouts"],
  });
  d.node("pp", 950, Y, 290, H, {
    kind: "paypal",
    title: "PayPal",
    size: 18,
    pad: 20,
    lines: ["One list call, then a full", "read of changed invoices"],
  });
  const lane = (x1: number, x2: number, label: string, colorA: string, colorB: string): void => {
    d.arrow(`M${x1} ${Y + 36} H${x2}`, { color: colorA, label, lx: x1 + 6, ly: Y + 26 });
    d.arrow(`M${x2} ${Y + 76} H${x1}`, { color: colorB });
  };
  lane(220, 300, "ask", K.blue, K.green);
  lane(520, 610, "read", K.blue, K.green);
  lane(860, 950, "refresh", K.blue, K.green);

  const facts = [
    "Served at once, however old",
    "Older than 60 s: refresh behind the answer",
    "A write refreshes its invoices first",
    "A failed refresh keeps the last snapshot",
  ];
  facts.forEach((f, i) => {
    const x = 40 + i * 302;
    d.card(`f${i}`, x, 794, 290, 44, { kind: "plain", rx: 22, shadow: false });
    d.words(`f${i}`, x + 145, 821, f, { size: 13.5, weight: 700, fill: K.navy, anchor: "middle" });
  });

  const hlr = (x: number, w: number): Rect => [x, Y, w, H];
  d.step({
    n: 1,
    color: K.blue,
    caption: "Home asks for the invoices",
    hl: [hlr(40, 180), hlr(300, 220)],
    token: `M220 ${Y + 36} H300`,
    badge: [262, Y + 6],
  });
  d.step({
    n: 2,
    color: K.green,
    caption: "The route reads the stored snapshot",
    hl: [hlr(300, 220), hlr(610, 250)],
    token: `M520 ${Y + 36} H610 V${Y + 76} H520`,
    badge: [565, Y + 6],
  });
  d.step({
    n: 3,
    color: K.green,
    caption: "It answers at once, with due states worked out for today",
    hl: [hlr(300, 220), hlr(40, 180)],
    token: `M300 ${Y + 76} H220`,
    badge: [262, Y + 100],
  });
  d.step({
    n: 4,
    color: K.blue,
    caption: "Older than 60 seconds: a refresh runs behind the answer",
    hl: [hlr(300, 220), hlr(950, 290)],
    token: `M520 ${Y + 20} V${Y - 12} H905 V${Y + 36} H950`,
    badge: [905, Y + 6],
  });
  d.step({
    n: 5,
    color: K.green,
    caption: "Only new or changed invoices are read in full, and the snapshot is saved",
    hl: [hlr(950, 290), hlr(610, 250)],
    token: `M950 ${Y + 76} H860 M860 ${Y + 76} H800`,
    badge: [905, Y + 100],
  });
  d.step({
    n: 6,
    color: K.navy,
    caption: "A write refreshes the invoices it touched before it answers",
    hl: [hlr(300, 220), hlr(950, 290), hlr(610, 250)],
    badge: [1214, Y + 24],
  });
  return d;
}
