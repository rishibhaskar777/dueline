import { Diagram, K, poly, type Rect, type Step } from "./lib";

type Lane = "u" | "r" | "s" | "p";

export function createSendOnce() {
  const d = new Diagram({
    slug: "create-send-once",
    title: "Creating and sending an invoice exactly once",
    desc: "A sequence diagram with four lifelines: the user, the route handler, the store and PayPal. The route claims the request ID in the store with a hash of the body, creates a draft invoice at PayPal with the request ID in its memo, sends it, reads the invoice back and stores the result before answering the user. The lower half replays the same request ID: the store already holds a completed result, so the route returns it to the user and PayPal is not called.",
    height: 990,
    period: 24,
    heading: "CREATING AND SENDING, EXACTLY ONCE",
    sub: "A repeated request ID returns the stored result and never calls PayPal.",
  });
  const L: Record<Lane, number> = { u: 170, r: 490, s: 810, p: 1120 };
  d.node("hu", L.u - 100, 140, 200, 52, { kind: "plain", title: "User", size: 17, pad: 0, rx: 16 });
  d.node("hr", L.r - 100, 140, 200, 52, {
    kind: "dueline",
    title: "Route handler",
    size: 17,
    pad: 0,
    rx: 16,
  });
  d.node("hs", L.s - 100, 140, 200, 52, {
    kind: "plain",
    title: "Store",
    size: 17,
    pad: 0,
    rx: 16,
  });
  d.node("hp", L.p - 100, 140, 200, 52, {
    kind: "paypal",
    title: "PayPal",
    size: 17,
    pad: 0,
    rx: 16,
  });
  // centre the header titles
  d.top = d.top.map((t) =>
    /data-card="h[urps]"/.test(t)
      ? t.replace(/ x="(\d+)"/, (_m, x: string) => ` x="${+x + 100}" text-anchor="middle"`)
      : t,
  );
  for (const x of Object.values(L))
    d.under.unshift(
      `<path d="M${x} 192 V960" stroke="#9aa6c4" stroke-width="2" stroke-dasharray="3 7" fill="none"/>`,
    );

  const row = (
    n: number,
    from: Lane,
    to: Lane,
    y: number,
    label: string,
    {
      color = K.blue,
      reply,
      lx,
      badgeX,
    }: { color?: string; reply?: string; lx?: number; badgeX?: number } = {},
  ): void => {
    const x1 = L[from],
      x2 = L[to];
    const dir = x2 > x1 ? 1 : -1;
    const left = Math.min(x1, x2);
    const tx = lx ?? (to === "p" || from === "p" ? L.s + 22 : left + 44);
    d.arrow(`M${x1 + dir * 0} ${y} H${x2}`, { color, label, lx: tx, ly: y - 9 });
    d.badge(n, badgeX ?? left + 24, y - 12, color);
    if (reply) {
      d.arrow(`M${x2} ${y + 26} H${x1}`, {
        color: K.green,
        labelFill: K.greenDk,
        label: reply,
        lx: tx,
        ly: y + 43,
      });
    }
  };
  const hl = (from: Lane, to: Lane, y: number, h: number): Rect => {
    const l = Math.min(L[from], L[to]) - 20;
    return [l, y - 24, Math.abs(L[to] - L[from]) + 40, h];
  };

  row(1, "u", "r", 240, "Create invoice: draft and request ID");
  // guard loop
  d.arrow(
    poly(
      [
        [L.r, 292],
        [L.r + 56, 292],
        [L.r + 56, 316],
        [L.r + 8, 316],
      ],
      8,
    ),
    { color: K.navy, label: "Recipient must be a sandbox buyer", lx: L.r + 70, ly: 309 },
  );
  d.badge(2, L.r - 24, 304, K.navy);
  row(3, "r", "s", 372, "Claim the request ID with the body hash", { reply: "claimed" });
  row(4, "r", "p", 448, "Create a draft, memo holds the request ID", {
    reply: "draft ID",
    color: K.blue,
  });
  row(5, "r", "p", 524, "Send the invoice", { reply: "sent" });
  row(6, "r", "p", 600, "Read the invoice again", { reply: "current status" });
  row(7, "r", "s", 676, "Store the result");
  row(8, "r", "u", 724, "Invoice, sent: true", { color: K.green });

  // divider
  d.under.push(
    `<path d="M40 776 H1240" stroke="#9aa6c4" stroke-width="2" stroke-dasharray="8 8" fill="none"/>`,
  );
  d.top.push(
    `<rect x="394" y="760" width="492" height="32" rx="16" fill="#ffffff" stroke="#c7d0e6"/>`,
  );
  d.note(640, 782, "The same request ID again: a double click or a retry", {
    anchor: "middle",
    fill: K.navy,
    weight: 700,
  });

  row(9, "u", "r", 836, "Same request ID, same body");
  row(10, "r", "s", 888, "Claim the request ID", { reply: "already done: stored result" });
  row(11, "r", "u", 958, "Same result. PayPal is not called.", { color: K.green });
  d.top.push(
    `<rect x="1030" y="942" width="180" height="32" rx="16" fill="${K.redBg}" stroke="${K.red}" stroke-width="2"/>`,
  );
  d.note(1120, 963, "PayPal: no call", { anchor: "middle", fill: K.red, weight: 800 });

  const out = (from: Lane, to: Lane, y: number): string => `M${L[from]} ${y} H${L[to]}`;
  const loop = (from: Lane, to: Lane, y: number): string =>
    `M${L[from]} ${y} H${L[to]} V${y + 26} H${L[from]}`;
  const S = (o: Step): void => d.step(o);
  S({
    n: 1,
    color: K.blue,
    caption: "The user creates an invoice. The form sends one request ID",
    hl: [hl("u", "r", 240, 44)],
    token: out("u", "r", 240),
  });
  S({
    n: 2,
    color: K.navy,
    caption: "The route checks the recipient before anything is claimed",
    hl: [[L.r - 40, 276, 330, 56]],
    token: `M${L.r} 292 H${L.r + 56} V316 H${L.r + 8}`,
  });
  S({
    n: 3,
    color: K.blue,
    caption: "The route claims the request ID in the store, before it calls PayPal",
    hl: [hl("r", "s", 372, 72)],
    token: loop("r", "s", 372),
  });
  S({
    n: 4,
    color: K.blue,
    caption: "It creates a draft at PayPal. The draft ID is saved",
    hl: [hl("r", "p", 448, 72)],
    token: loop("r", "p", 448),
  });
  S({
    n: 5,
    color: K.blue,
    caption: "Creating and sending are separate calls. Now it sends",
    hl: [hl("r", "p", 524, 72)],
    token: loop("r", "p", 524),
  });
  S({
    n: 6,
    color: K.blue,
    caption: "It reads the invoice back, because PayPal's state is the truth",
    hl: [hl("r", "p", 600, 72)],
    token: loop("r", "p", 600),
  });
  S({
    n: 7,
    color: K.blue,
    caption: "The result is stored with the request ID",
    hl: [hl("r", "s", 676, 44)],
    token: out("r", "s", 676),
  });
  S({
    n: 8,
    color: K.green,
    caption: "The user sees the invoice, sent",
    hl: [hl("u", "r", 724, 44)],
    token: out("r", "u", 724),
  });
  S({
    n: 9,
    color: K.amber,
    caption: "A double click or a retry sends the same request ID again",
    hl: [hl("u", "r", 836, 44)],
    token: out("u", "r", 836),
  });
  S({
    n: 10,
    color: K.amber,
    caption: "The store already holds the finished result for that ID",
    hl: [hl("r", "s", 888, 72)],
    token: loop("r", "s", 888),
  });
  S({
    n: 11,
    color: K.green,
    caption: "The route returns that result. PayPal is not called a second time",
    hl: [hl("u", "r", 958, 44), [1030, 942, 180, 32]],
    token: out("r", "u", 958),
  });
  return d;
}
