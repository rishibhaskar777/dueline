import { Diagram, K } from "./lib";

export function morningRun() {
  const d = new Diagram({
    slug: "morning-run",
    title: "The morning run",
    desc: "Every day at 06:00 India time the scheduler calls the daily route with a secret bearer token. Dueline checks the token in constant time and claims the India day in the store. It rebuilds the invoice snapshot from PayPal, drafts reminders for overdue and due-soon invoices within the daily model allowance, replaces the reminder items in the queue, turns due monthly repeats into drafts, reconciles payments from the last 14 days, rebuilds the snapshot again and returns a digest. The run never creates, sends or reminds anything. A second call on the same day finds the day already claimed and returns the stored result without calling PayPal or the model.",
    height: 760,
    period: 22,
    heading: "THE MORNING RUN",
    sub: "Once per India day, however many times it is asked for. It only prepares.",
  });
  const W = 260,
    h = 150,
    xs = [51, 357, 663, 969],
    Y1 = 150,
    Y2 = 340;
  d.node("n1", xs[0], Y1, W, h, {
    kind: "amber",
    title: "Scheduler fires",
    size: 18,
    pad: 20,
    lines: [
      "Every day at 06:00 India",
      "time. Vercel cron may start",
      "at any minute of the hour.",
    ],
  });
  d.node("n2", xs[1], Y1, W, h, {
    kind: "dueline",
    title: "Check the secret",
    size: 18,
    pad: 20,
    lines: [
      "A secret bearer token, hashed",
      "and compared in constant time.",
      "Anything else is 401.",
    ],
  });
  d.node("n3", xs[2], Y1, W, h, {
    kind: "dueline",
    title: "Claim the day",
    size: 18,
    pad: 20,
    lines: ["The India day is the request", "ID, the same claim that guards", "invoice creation."],
  });
  d.node("n4", xs[3], Y1, W, h, {
    kind: "paypal",
    title: "Reload invoices",
    size: 18,
    pad: 20,
    lines: ["The invoice snapshot is", "rebuilt from PayPal, so the", "rest works on fresh data."],
  });
  d.node("n5", xs[3], Y2, W, h, {
    kind: "violet",
    title: "Draft reminders",
    size: 18,
    pad: 20,
    lines: [
      "Late and due-soon invoices, up",
      "to 10 of each, within the model",
      "allowance. Promised ones wait.",
    ],
  });
  d.node("n6", xs[2], Y2, W, h, {
    kind: "dueline",
    title: "Queue and reconcile",
    size: 18,
    pad: 20,
    lines: [
      "Reminder items replaced as a",
      "set. Due repeats become drafts.",
      "Paid rows from 14 days added.",
    ],
  });
  d.node("n7", xs[1], Y2, W, h, {
    kind: "plain",
    title: "Digest",
    size: 18,
    pad: 20,
    lines: ["The snapshot is rebuilt again.", "The digest says what needs", "attention today."],
  });
  d.node("n8", xs[0], Y2, W, h, {
    kind: "green",
    title: "It only prepares",
    size: 18,
    pad: 20,
    lines: [
      "Nothing is created, sent or",
      "reminded. Every item opens a",
      "screen where a click decides.",
    ],
  });

  const mid = (y: number): number => y + h / 2;
  d.arrow(`M${xs[0] + W} ${mid(Y1)} H${xs[1]}`, { color: K.amber });
  d.arrow(`M${xs[1] + W} ${mid(Y1)} H${xs[2]}`, { color: K.blue });
  d.arrow(`M${xs[2] + W} ${mid(Y1)} H${xs[3]}`, { color: K.blue });
  d.arrow(`M${xs[3] + W / 2} ${Y1 + h} V${Y2}`, { color: K.violet });
  d.arrow(`M${xs[3]} ${mid(Y2)} H${xs[2] + W}`, { color: K.blue });
  d.arrow(`M${xs[2]} ${mid(Y2)} H${xs[1] + W}`, { color: K.blue });

  // second call
  d.card("lane", 40, 540, 1200, 180, { kind: "plain", rx: 22, dash: true });
  d.words("lane", 64, 572, "A second call the same day: a retry, or the Demo tools button", {
    size: 17,
    weight: 800,
    fill: K.ink,
  });
  d.chip("lane", "r1", 64, 592, 330, 100, {
    kind: "outside",
    title: "Same request again",
    lines: ["The scheduler retries, or the", "demo button runs the same code."],
    fill: K.amberBg,
  });
  d.chip("lane", "r2", 475, 592, 330, 100, {
    kind: "outside",
    title: "The day is already claimed",
    lines: ["The claim finds the stored result.", "No PayPal call, no model call."],
    fill: K.paypalBg,
  });
  d.chip("lane", "r3", 886, 592, 330, 100, {
    kind: "outside",
    title: "Answer: ran false",
    lines: ["The stored result and a digest", "built from the shown invoices."],
    fill: K.greenBg,
  });
  d.arrow("M394 642 H475", { color: K.amber, over: true });
  d.arrow("M805 642 H886", { color: K.green, over: true });

  const bx = (i: number): number => xs[i] + W - 26;
  d.step({
    n: 1,
    color: K.amber,
    caption: "At 06:00 India time the scheduler calls the daily route",
    hl: [[xs[0], Y1, W, h]],
    token: `M${xs[0] + W} ${mid(Y1)} H${xs[1]}`,
    badge: [bx(0), Y1 + 24],
  });
  d.step({
    n: 2,
    color: K.blue,
    caption: "The route checks the secret bearer token",
    hl: [[xs[1], Y1, W, h]],
    token: `M${xs[1] + W} ${mid(Y1)} H${xs[2]}`,
    badge: [bx(1), Y1 + 24],
  });
  d.step({
    n: 3,
    color: K.blue,
    caption: "It claims today's India date in the store",
    hl: [[xs[2], Y1, W, h]],
    token: `M${xs[2] + W} ${mid(Y1)} H${xs[3]}`,
    badge: [bx(2), Y1 + 24],
  });
  d.step({
    n: 4,
    color: K.blue,
    caption: "It reloads the invoices from PayPal",
    hl: [[xs[3], Y1, W, h]],
    token: `M${xs[3] + W / 2} ${Y1 + h} V${Y2}`,
    badge: [bx(3), Y1 + 24],
  });
  d.step({
    n: 5,
    color: K.violet,
    caption: "It drafts reminders, within the daily allowance",
    hl: [[xs[3], Y2, W, h]],
    token: `M${xs[3]} ${mid(Y2)} H${xs[2] + W}`,
    badge: [bx(3), Y2 + 24],
  });
  d.step({
    n: 6,
    color: K.blue,
    caption: "It fills the queue, moves repeats on and reconciles payments",
    hl: [[xs[2], Y2, W, h]],
    token: `M${xs[2]} ${mid(Y2)} H${xs[1] + W}`,
    badge: [bx(2), Y2 + 24],
  });
  d.step({
    n: 7,
    color: K.green,
    caption: "It rebuilds the snapshot and returns the digest. Nothing is sent",
    hl: [
      [xs[1], Y2, W, h],
      [xs[0], Y2, W, h],
    ],
    badge: [bx(1), Y2 + 24],
  });
  d.step({
    n: 8,
    color: K.amber,
    caption: "A second call that day gets the stored result. PayPal is not called",
    hl: [
      [64, 592, 330, 100],
      [475, 592, 330, 100],
      [886, 592, 330, 100],
    ],
    token: "M394 642 H805",
    badge: [1190, 556],
  });
  return d;
}
