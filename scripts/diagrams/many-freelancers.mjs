import { Diagram, K, poly } from "./lib.mjs";

export function manyFreelancers() {
  const d = new Diagram({
    slug: "many-freelancers",
    title: "Serving many freelancers: a design, not built",
    desc: "A design, not built. Many freelancers connect their own PayPal business account once through Log in with PayPal and an invoicing permission. Their tokens are kept encrypted in a token vault. A signed session cookie carries the tenant ID, so every route runs for one tenant and reaches Postgres through storeFor(tenant), with a tenant ID on every row and row-level security as a second defence. One app-level webhook endpoint finds the tenant from an invoice index. A frequent cron claims each tenant's morning run. Each tenant has a model budget under one shared ceiling, and exchange rates stay shared.",
    height: 880,
    period: 22,
    heading: "SERVING MANY FREELANCERS",
    sub: "Decision 0019. Nothing on this page exists in the code yet.",
  });
  d.top.push(
    `<rect x="430" y="34" width="220" height="32" rx="16" fill="${K.amberBg}" stroke="${K.amber}" stroke-width="2"/>`,
  );
  d.note(540, 55, "DESIGN, NOT BUILT", { anchor: "middle", fill: K.amberDk, weight: 800 });

  const dash = true;
  d.node("fl", 40, 150, 230, 100, {
    kind: "plain",
    title: "Many freelancers",
    size: 18,
    pad: 20,
    dash,
    lines: ["Browsers, one workspace", "each"],
  });
  d.node("cn", 370, 150, 440, 100, {
    kind: "plain",
    title: "Connect PayPal, once",
    size: 18,
    pad: 20,
    dash,
    lines: ["Log in with PayPal and an invoicing permission.", "Dueline never holds a password."],
  });
  d.node("tv", 970, 150, 270, 100, {
    kind: "plain",
    title: "Token vault",
    size: 18,
    pad: 20,
    dash,
    lines: ["Each tenant's tokens,", "encrypted"],
  });

  d.card("du", 370, 290, 440, 400, { kind: "dueline", rx: 26, dash });
  d.words("du", 394, 324, "Dueline, with a tenant context", {
    size: 19,
    weight: 800,
    fill: "#fff",
  });
  const chips = [
    ["Proxy: the session gives the tenant", "Never from the body or the URL"],
    ["Route handlers", "Every request runs for one tenant"],
    ["storeFor(tenant)", "Every query already carries the tenant"],
    ["Webhook resolver", "invoice_index finds the tenant, then a fresh read"],
    ["Daily fan-out", "daily-run:<tenant>:<day>, one claim each"],
  ];
  chips.forEach(([t, l], i) =>
    d.chip("du", `dc${i}`, 392, 350 + i * 66, 396, 56, { kind: "dueline", title: t, lines: [l] }),
  );

  d.node("pp", 970, 380, 270, 130, {
    kind: "paypal",
    title: "PayPal",
    size: 18,
    pad: 20,
    dash,
    lines: ["Each freelancer's own", "business account"],
  });
  d.node("pg", 970, 540, 270, 110, {
    kind: "plain",
    title: "Postgres",
    size: 18,
    pad: 20,
    dash,
    lines: ["tenant_id on every row,", "row-level security"],
  });
  d.node("wh", 40, 440, 230, 100, {
    kind: "paypal",
    title: "PayPal webhooks",
    size: 18,
    pad: 20,
    dash,
    lines: ["One app-level endpoint,", "signature check unchanged"],
  });
  d.node("cr", 40, 592, 230, 100, {
    kind: "amber",
    title: "Frequent cron",
    size: 18,
    pad: 20,
    dash,
    lines: ["Claims each tenant's", "morning run"],
  });
  d.node("ge", 370, 740, 215, 100, {
    kind: "violet",
    title: "Gemini",
    size: 18,
    pad: 20,
    dash,
    lines: ["Per-tenant budget under", "one shared ceiling"],
  });
  d.node("ec", 595, 740, 215, 100, {
    kind: "plain",
    title: "ECB rates",
    size: 18,
    pad: 20,
    dash,
    lines: ["Shared, read and cached", "once a day"],
  });

  d.arrow("M270 200 H370", { color: K.blue, label: "once", lx: 296, ly: 190 });
  d.arrow("M810 200 H970", { color: K.navy, label: "tokens, encrypted", lx: 818, ly: 190 });
  const sess = poly(
    [
      [155, 250],
      [155, 378],
      [392, 378],
    ],
    12,
  );
  d.arrow(sess, { color: K.blue });
  d.label(166, 330, "signs in", { fill: K.navy });
  d.arrow("M788 444 H970", { color: K.blue, label: "the tenant's own token", lx: 818, ly: 434 });
  d.arrow("M1105 250 V380", { color: K.navy });
  const toDb = poly(
    [
      [788, 510],
      [880, 510],
      [880, 595],
      [970, 595],
    ],
    12,
  );
  d.arrow(toDb, { color: K.navy });
  const wh = poly(
    [
      [270, 490],
      [330, 490],
      [330, 576],
      [392, 576],
    ],
    12,
  );
  d.arrow(wh, { color: K.green, labelFill: K.greenDk });
  d.arrow("M270 642 H392", { color: K.amber });
  d.arrow("M477 690 V740", { color: K.violet });
  d.arrow("M702 740 V690", { color: K.blue });

  d.step({
    n: 1,
    color: K.blue,
    caption: "Each freelancer connects their own PayPal account once",
    hl: [
      [40, 150, 230, 100],
      [370, 150, 440, 100],
    ],
    token: "M270 200 H370",
    badge: [294, 226],
  });
  d.step({
    n: 2,
    color: K.navy,
    caption: "Their tokens are kept encrypted in a vault",
    hl: [[970, 150, 270, 100]],
    token: "M810 200 H970",
    badge: [850, 226],
  });
  d.step({
    n: 3,
    color: K.blue,
    caption: "A signed session gives every request its tenant",
    hl: [[392, 350, 396, 56]],
    token: sess,
    badge: [200, 360],
  });
  d.step({
    n: 4,
    color: K.blue,
    caption: "Routes call PayPal with that tenant's own token",
    hl: [
      [970, 380, 270, 130],
      [392, 416, 396, 56],
    ],
    token: "M788 444 H970",
    badge: [850, 470],
  });
  d.step({
    n: 5,
    color: K.navy,
    caption: "storeFor(tenant) reaches Postgres, where row-level security backs it up",
    hl: [
      [392, 482, 396, 56],
      [970, 540, 270, 110],
    ],
    token: toDb,
    badge: [900, 560],
  });
  d.step({
    n: 6,
    color: K.green,
    caption: "One webhook endpoint finds the tenant from the invoice index",
    hl: [
      [40, 440, 230, 100],
      [392, 548, 396, 56],
    ],
    token: wh,
    badge: [356, 524],
  });
  d.step({
    n: 7,
    color: K.amber,
    caption: "A frequent cron claims each tenant's morning run",
    hl: [
      [40, 592, 230, 100],
      [392, 614, 396, 56],
    ],
    token: "M270 642 H392",
    badge: [310, 668],
  });
  d.step({
    n: 8,
    color: K.violet,
    caption: "Model calls count per tenant under one shared ceiling",
    hl: [[370, 740, 215, 100]],
    token: "M477 690 V740",
    badge: [452, 716],
  });
  return d;
}
