import { Diagram, K } from "./lib.mjs";

export function paymentReaches() {
  const d = new Diagram({
    slug: "payment-reaches",
    title: "A payment reaches Dueline",
    desc: "The client pays on PayPal's own page. PayPal posts a signed webhook to Dueline. Dueline sends the raw body and headers back to PayPal's verify-webhook-signature API and goes on only when PayPal answers SUCCESS. It then reads the invoice from PayPal, looks up the capture and, if needed, Transaction Search for the real fee, net amount and rupees, stores those figures, refreshes the invoice snapshot and Home shows the rupees. A webhook that fails verification is refused, an event already processed is answered with 204, and a webhook that never arrives is made up by the morning run.",
    height: 700,
    period: 18,
    heading: "A PAYMENT REACHES DUELINE",
    sub: "PayPal's own figures, read after the money moves.",
  });
  const W = 260,
    Y1 = 150,
    Y2 = 340,
    h = 150;
  const xs = [51, 357, 663, 969];
  const nodes = [
    [
      "n1",
      xs[0],
      Y1,
      "green",
      "Client pays",
      ["On PayPal's own page, by card", "or PayPal balance. The invoice", "becomes PAID."],
    ],
    [
      "n2",
      xs[1],
      Y1,
      "paypal",
      "Signed webhook",
      ["PayPal posts the event to", "Dueline with five signature", "headers."],
    ],
    [
      "n3",
      xs[2],
      Y1,
      "dueline",
      "Verify the signature",
      ["Raw body and headers go to", "PayPal's verify API. Only", "SUCCESS goes on."],
    ],
    [
      "n4",
      xs[3],
      Y1,
      "dueline",
      "Read the invoice",
      ["Dueline asks PayPal for the", "invoice. The event body is", "not used for anything else."],
    ],
    [
      "n5",
      xs[3],
      Y2,
      "paypal",
      "Capture, then search",
      ["Payments capture: fee, net,", "and rupees if reported.", "Else Transaction Search."],
    ],
    [
      "n6",
      xs[2],
      Y2,
      "dueline",
      "Store and refresh",
      ["Payout figures are saved.", "The invoice snapshot is", "rebuilt for this invoice."],
    ],
    [
      "n7",
      xs[1],
      Y2,
      "plain",
      "Home updates",
      ["Paid, with PayPal's fee, net", "and rupees. The next 10 second", "refresh picks it up."],
    ],
  ];
  for (const [id, x, y, kind, t, lines] of nodes)
    d.node(id, x, y, W, h, { kind, title: t, lines, size: 18, pad: 20 });
  d.node("n8", xs[0], Y2, W, h, {
    kind: "amber",
    title: "Why read it again",
    size: 18,
    pad: 20,
    lines: [
      "A webhook only says that",
      "something changed. PayPal's",
      "current invoice is the truth.",
    ],
  });

  const mid = (n) => n + h / 2;
  d.arrow(`M${xs[0] + W} ${mid(Y1)} H${xs[1]}`, { color: K.green });
  d.arrow(`M${xs[1] + W} ${mid(Y1)} H${xs[2]}`, { color: K.blue });
  d.arrow(`M${xs[2] + W} ${mid(Y1)} H${xs[3]}`, { color: K.blue });
  d.arrow(`M${xs[3] + W / 2} ${Y1 + h} V${Y2}`, { color: K.blue });
  d.arrow(`M${xs[3]} ${mid(Y2)} H${xs[2] + W}`, { color: K.blue });
  d.arrow(`M${xs[2]} ${mid(Y2)} H${xs[1] + W}`, { color: K.green });

  // failure and fallback notes
  const notes = [
    [
      "not",
      51,
      K.red,
      "Not verified",
      [
        "PayPal does not answer SUCCESS:",
        "400 invalid_webhook. Nothing",
        "changes. Simulator events too.",
      ],
    ],
    [
      "rep",
      457,
      K.amberDk,
      "Seen before",
      ["The event ID was processed:", "204 and nothing else happens."],
    ],
    [
      "lost",
      863,
      K.navy,
      "Webhook never arrives",
      [
        "The morning run adds the missing",
        "paid row for payments of the",
        "last 14 days. Figures still come",
        "from PayPal on every read.",
      ],
    ],
  ];
  for (const [id, x, c, t, lines] of notes)
    d.node(id, x, 540, 366, 124, { kind: "plain", title: t, size: 17, pad: 20, tint: c, lines });

  d.step({
    n: 1,
    color: K.green,
    caption: "The client pays on PayPal's own page",
    hl: [[xs[0], Y1, W, h]],
    token: `M${xs[0] + W} ${mid(Y1)} H${xs[1]}`,
    badge: [xs[0] + W - 26, Y1 + 24],
  });
  d.step({
    n: 2,
    color: K.blue,
    caption: "PayPal posts a signed webhook to Dueline",
    hl: [[xs[1], Y1, W, h]],
    token: `M${xs[1] + W} ${mid(Y1)} H${xs[2]}`,
    badge: [xs[1] + W - 26, Y1 + 24],
  });
  d.step({
    n: 3,
    color: K.navy,
    caption: "Dueline has PayPal verify the signature on the exact body it received",
    hl: [[xs[2], Y1, W, h]],
    token: `M${xs[2] + W} ${mid(Y1)} H${xs[3]}`,
    badge: [xs[2] + W - 26, Y1 + 24],
  });
  d.step({
    n: 4,
    color: K.navy,
    caption: "Dueline reads the invoice from PayPal, the only source it trusts",
    hl: [[xs[3], Y1, W, h]],
    token: `M${xs[3] + W / 2} ${Y1 + h} V${Y2}`,
    badge: [xs[3] + W - 26, Y1 + 24],
  });
  d.step({
    n: 5,
    color: K.blue,
    caption: "It looks up the capture, then Transaction Search for the real fee and net",
    hl: [[xs[3], Y2, W, h]],
    token: `M${xs[3]} ${mid(Y2)} H${xs[2] + W}`,
    badge: [xs[3] + W - 26, Y2 + 24],
  });
  d.step({
    n: 6,
    color: K.navy,
    caption: "It stores the figures and refreshes the invoice snapshot",
    hl: [[xs[2], Y2, W, h]],
    token: `M${xs[2]} ${mid(Y2)} H${xs[1] + W}`,
    badge: [xs[2] + W - 26, Y2 + 24],
  });
  d.step({
    n: 7,
    color: K.green,
    caption: "Home shows what reached the bank, in rupees",
    hl: [[xs[1], Y2, W, h]],
    badge: [xs[1] + W - 26, Y2 + 24],
  });
  return d;
}
