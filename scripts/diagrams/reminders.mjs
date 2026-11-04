import { Diagram, K, poly } from "./lib.mjs";

export function remindersFlow() {
  const d = new Diagram({
    slug: "reminders",
    title: "Reminders, heads-ups and promises",
    desc: "An invoice that is not yet due gets a heads-up. A late invoice gets a gentle, firm or final reminder chosen from the days late, the reminders already sent and the client's history. A promised date pauses drafting until that date, and a broken promise makes the next reminder firm. Gemini writes a draft from facts only, with no contact details. Code checks the draft and falls back to a template in the client's language when the draft fails. The freelancer reviews it and sends either PayPal's own reminder or their own message. The reminder is logged once and the card closes for the day.",
    height: 740,
    period: 22,
    heading: "REMINDERS, HEADS-UPS AND PROMISES",
    sub: "The tone comes from facts. The freelancer sends. Nothing goes out by itself.",
  });
  // tone ladder
  const tones = [
    ["t0", "Heads-up", "Not yet due: due today or soon.", "Never mentions lateness.", K.green],
    ["t1", "Gentle", "Late, under 8 days, no reminder yet.", "", K.blue],
    [
      "t2",
      "Firm",
      "8 days late, one reminder sent, a",
      "late payer or a broken promise.",
      K.amberDk,
    ],
    ["t3", "Final", "Over 30 days late, or two", "reminders already sent.", K.red],
  ];
  tones.forEach(([id, t, a, b, c], i) => {
    d.card(id, 40, 150 + i * 90, 300, 80, { kind: "plain", rx: 18 });
    d.words(id, 62, 150 + i * 90 + 28, t, { size: 17, weight: 800, fill: c });
    d.words(id, 62, 150 + i * 90 + 50, a, { fill: K.mute });
    if (b) d.words(id, 62, 150 + i * 90 + 68, b, { fill: K.mute });
  });
  d.node("pr", 40, 520, 300, 130, {
    kind: "amber",
    title: "Promised date",
    size: 17,
    pad: 22,
    lines: [
      "The client said when they",
      "will pay. Drafting pauses",
      "until then. A missed date",
      "makes the next one firm.",
    ],
  });

  // pipeline
  d.node("dm", 400, 150, 310, 112, {
    kind: "violet",
    title: "Gemini drafts",
    size: 17,
    pad: 22,
    lines: ["From facts only: client name,", "amounts, dates, days late.", "No email or phone."],
  });
  d.card("ck", 400, 300, 310, 170, { kind: "dueline", rx: 22 });
  d.words("ck", 422, 334, "Checks in code", { size: 17, weight: 800, fill: "#fff" });
  [
    "Length, invoice number, every amount",
    "No links or email addresses",
    "Words match the tone",
    "Sign-off added by code, not the model",
  ].forEach((l, i) => d.words("ck", 422, 362 + i * 24, l, { fill: "#cfdcff" }));
  d.node("tp", 400, 520, 310, 150, {
    kind: "plain",
    title: "Template fallback",
    size: 17,
    pad: 22,
    lines: [
      "In the client's language.",
      "Used when the draft fails a",
      "check, the model is down or",
      "the daily allowance is spent.",
    ],
  });

  d.node("rv", 770, 300, 210, 170, {
    kind: "plain",
    title: "Review",
    size: 17,
    pad: 20,
    lines: ["Editable subject and", "message. Saved for 24", "hours. Nothing is sent", "yet."],
  });
  d.card("sd", 1030, 150, 210, 300, { kind: "paypal", rx: 22 });
  d.words("sd", 1050, 184, "One click sends", { size: 17, weight: 800, fill: K.navy });
  d.chip("sd", "sd1", 1042, 204, 186, 108, {
    kind: "paypal",
    title: "PayPal reminder",
    lines: ["PayPal's own wording.", "Two a day for the", "account."],
  });
  d.chip("sd", "sd2", 1042, 326, 186, 108, {
    kind: "paypal",
    title: "My own message",
    lines: ["Email with the pay", "link. “I sent it”", "records it."],
  });
  d.node("lg", 1030, 500, 210, 170, {
    kind: "green",
    title: "Logged once",
    size: 17,
    pad: 20,
    lines: ["Reminder log and an", "activity row. The card", "closes for the day."],
  });

  d.arrow(
    poly(
      [
        [356, 460],
        [356, 190],
        [400, 190],
      ],
      12,
    ),
    { color: K.blue },
  );
  for (const y of [190, 280, 370, 460])
    d.under.push(`<path class="rail" stroke="${K.blue}" d="M340 ${y} H356"/>`);
  d.arrow(
    poly(
      [
        [340, 595],
        [372, 595],
        [372, 245],
        [400, 245],
      ],
      12,
    ),
    { color: K.amber },
  );
  d.arrow("M555 262 V300", { color: K.violet });
  d.arrow("M555 470 V520", { color: K.red, label: "fails", lx: 566, ly: 500 });
  d.arrow("M710 385 H770", { color: K.green, label: "passes", lx: 714, ly: 375 });
  d.arrow(
    poly(
      [
        [710, 595],
        [740, 595],
        [740, 425],
        [770, 425],
      ],
      12,
    ),
    { color: K.blue },
  );
  d.arrow("M980 385 H1030", { color: K.blue });
  d.arrow("M1135 450 V500", { color: K.green });

  d.step({
    n: 1,
    color: K.green,
    caption: "An invoice nearing its due date gets a heads-up, never a late notice",
    hl: [[40, 150, 300, 80]],
    token: "M340 190 H400",
    badge: [316, 174],
  });
  d.step({
    n: 2,
    color: K.amberDk,
    caption: "A late invoice gets gentle, firm or final from its facts and history",
    hl: [[40, 240, 300, 260]],
    token: poly(
      [
        [340, 370],
        [356, 370],
        [356, 190],
        [400, 190],
      ],
      12,
    ),
    badge: [316, 264],
  });
  d.step({
    n: 3,
    color: K.amber,
    caption: "A promised date pauses drafting until that date",
    hl: [[40, 520, 300, 130]],
    token: poly(
      [
        [340, 595],
        [372, 595],
        [372, 245],
        [400, 245],
      ],
      12,
    ),
    badge: [316, 546],
  });
  d.step({
    n: 4,
    color: K.violet,
    caption: "Gemini writes a draft from facts only. No contact details reach it",
    hl: [[400, 150, 310, 112]],
    token: "M555 262 V300",
    badge: [686, 176],
  });
  d.step({
    n: 5,
    color: K.red,
    caption: "Code checks it. A draft that fails becomes a template",
    hl: [
      [400, 300, 310, 170],
      [400, 520, 310, 150],
    ],
    token: "M555 470 V520",
    badge: [686, 326],
  });
  d.step({
    n: 6,
    color: K.blue,
    caption: "The draft opens for review. The freelancer may edit it",
    hl: [[770, 300, 210, 170]],
    token: "M710 385 H770",
    badge: [956, 326],
  });
  d.step({
    n: 7,
    color: K.blue,
    caption: "The freelancer sends PayPal's reminder or their own message",
    hl: [
      [1042, 204, 186, 108],
      [1042, 326, 186, 108],
    ],
    token: "M980 385 H1030",
    badge: [1214, 176],
  });
  d.step({
    n: 8,
    color: K.green,
    caption: "The send is logged once and the card closes for the day",
    hl: [[1030, 500, 210, 170]],
    token: "M1135 450 V500",
    badge: [1216, 526],
  });
  return d;
}
