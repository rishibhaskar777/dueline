// Shared drawing helpers for the architecture diagrams. Same visual language as docs/media/architecture.svg.
export const K = {
  navy: "#0a2a7a",
  navy2: "#071c57",
  blue: "#1d63f0",
  ink: "#0b0b0f",
  mute: "#4c5260",
  green: "#0e8a4f",
  greenDk: "#0b6b3c",
  greenBg: "#ecf8f1",
  amber: "#e08a00",
  amberDk: "#8a4f00",
  amberBg: "#fff6e6",
  violet: "#7c3aed",
  violetDk: "#6d28d9",
  violetBg: "#f3efff",
  paypalBg: "#eef3fd",
  red: "#c42b22",
  redBg: "#fdeceb",
  sheet: "#ffffff",
  grey: "#6b7385",
  greyBg: "#f4f5f8",
  greyLine: "#cfd5e2",
};

export const esc = (s: unknown): string =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f = (n: number): number => Math.round(n * 100) / 100;
const f4 = (n: number): string => (Math.round(n * 10000) / 10000).toFixed(4);

export type Point = [number, number];

export function poly(pts: Point[], r = 14): string {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1],
      [x1, y1] = pts[i],
      [x2, y2] = pts[i + 1];
    const l1 = Math.hypot(x1 - x0, y1 - y0),
      l2 = Math.hypot(x2 - x1, y2 - y1);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    if (!rr) {
      d += ` L${x1} ${y1}`;
      continue;
    }
    d += ` L${f(x1 - ((x1 - x0) / l1) * rr)} ${f(y1 - ((y1 - y0) / l1) * rr)} Q${x1} ${y1} ${f(x1 + ((x2 - x1) / l2) * rr)} ${f(y1 + ((y2 - y1) / l2) * rr)}`;
  }
  const l = pts[pts.length - 1];
  return d + ` L${l[0]} ${l[1]}`;
}

export type Kind = "dueline" | "paypal" | "outside" | "violet" | "green" | "amber" | "plain";

interface Palette {
  fill: string;
  stroke: string;
  title: string;
  sub: string;
  chip?: string;
  chipTitle?: string;
  chipSub?: string;
}

const KINDS: Record<Kind, Palette> = {
  dueline: {
    fill: "url(#navy)",
    stroke: "none",
    title: "#ffffff",
    sub: "#cfdcff",
    chip: "rgba(255,255,255,.09)",
    chipTitle: "#ffffff",
    chipSub: "#cfdcff",
  },
  paypal: {
    fill: "#ffffff",
    stroke: K.blue,
    title: K.navy,
    sub: K.mute,
    chip: K.paypalBg,
    chipTitle: K.ink,
    chipSub: K.mute,
  },
  outside: {
    fill: "#ffffff",
    stroke: K.greyLine,
    title: K.ink,
    sub: K.mute,
    chip: K.greyBg,
    chipTitle: K.ink,
    chipSub: K.mute,
  },
  violet: { fill: K.violetBg, stroke: "none", title: K.ink, sub: K.mute },
  green: { fill: K.greenBg, stroke: "none", title: K.ink, sub: K.mute },
  amber: { fill: K.amberBg, stroke: "none", title: K.ink, sub: K.mute },
  plain: { fill: "#ffffff", stroke: "none", title: K.ink, sub: K.mute },
};

export interface DiagramMeta {
  slug: string;
  title: string;
  desc: string;
  height: number;
  period: number;
  heading: string;
  sub: string;
}

export type Rect = [number, number, number, number];
type Anchor = "start" | "middle" | "end";

export interface Step {
  n: number;
  color: string;
  caption: string;
  hl?: Rect[];
  token?: string;
  badge?: Point;
  w?: number;
}

interface CardOptions {
  kind?: Kind;
  rx?: number;
  shadow?: boolean;
  dash?: boolean;
}

interface TextOptions {
  size?: number;
  weight?: number;
  fill?: string;
  anchor?: Anchor;
}

interface NodeOptions {
  kind?: Kind;
  title: string;
  lines?: string[];
  size?: number;
  pad?: number;
  tint?: string;
  rx?: number;
  dash?: boolean;
}

interface ChipOptions {
  kind?: Kind;
  title: string;
  lines?: string[];
  fill?: string;
  titleFill?: string;
}

interface ArrowOptions {
  color?: string;
  rev?: boolean;
  slow?: boolean;
  label?: string;
  lx?: number;
  ly?: number;
  anchor?: Anchor;
  labelFill?: string;
  over?: boolean;
}

interface LabelOptions {
  fill?: string;
  anchor?: Anchor;
}

type ResolvedStep = Step & Required<Pick<Step, "hl" | "w">>;

export class Diagram {
  slug: string;
  title: string;
  desc: string;
  height: number;
  period: number;
  heading: string;
  sub: string;
  under: string[] = [];
  cards: string[] = [];
  top: string[] = [];
  steps: ResolvedStep[] = [];
  markers = new Map<string, string>();
  extras: ((d: Diagram) => string)[] = [];
  ids = new Map<string, { x: number; y: number; w: number; h: number }>();

  constructor({ slug, title, desc, height, period, heading, sub }: DiagramMeta) {
    this.slug = slug;
    this.title = title;
    this.desc = desc;
    this.height = height;
    this.period = period;
    this.heading = heading;
    this.sub = sub;
  }

  marker(color: string): string {
    const id = "ah" + color.replace("#", "");
    this.markers.set(id, color);
    return id;
  }

  // A card. kind picks the palette; id lets text be checked against its box.
  card(
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    { kind = "plain", rx = 20, shadow = true, dash = false }: CardOptions = {},
  ): void {
    const k = KINDS[kind];
    this.ids.set(id, { x, y, w, h });
    let stroke = k.stroke !== "none" ? ` stroke="${k.stroke}" stroke-width="2"` : "";
    if (dash)
      stroke = ` stroke="${kind === "dueline" ? "#7f95d6" : "#7d89aa"}" stroke-width="2.5" stroke-dasharray="9 6"`;
    const r = `<rect data-id="${id}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${k.fill}"${stroke}/>`;
    this.cards.push(shadow ? `<g filter="url(#sh)">${r}</g>` : r);
  }

  // Text inside a card: bold title then lines. Pass `at` to place the first baseline.
  words(
    card: string,
    x: number,
    y: number,
    str: string,
    { size = 13.5, weight = 400, fill = K.mute, anchor = "start" }: TextOptions = {},
  ): void {
    this.top.push(
      `<text data-card="${card}" x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}"${anchor !== "start" ? ` text-anchor="${anchor}"` : ""}>${esc(str)}</text>`,
    );
  }

  node(
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    {
      kind = "plain",
      title,
      lines = [],
      size = 19,
      pad = 22,
      tint,
      rx = 22,
      dash = false,
    }: NodeOptions,
  ): void {
    this.card(id, x, y, w, h, { kind, rx, dash });
    const k = KINDS[kind];
    this.words(id, x + pad, y + 8 + size + 6, title, { size, weight: 800, fill: tint || k.title });
    lines.forEach((l, i) =>
      this.words(id, x + pad, y + 8 + size + 6 + 24 + i * 19, l, { fill: k.sub }),
    );
  }

  // A smaller row inside a card.
  chip(
    parent: string,
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    { kind = "outside", title, lines = [], fill, titleFill }: ChipOptions,
  ): void {
    const k = KINDS[kind];
    this.ids.set(id, { x, y, w, h });
    this.cards.push(
      `<rect data-id="${id}" x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${fill || k.chip}"/>`,
    );
    this.words(parent, x + 16, y + 25, title, {
      size: 15,
      weight: 700,
      fill: titleFill || k.chipTitle,
    });
    lines.forEach((l, i) => this.words(parent, x + 16, y + 46 + i * 18, l, { fill: k.chipSub }));
  }

  // Arrow with a faint rail, an animated dashed flow on top and an arrow head at the end.
  arrow(
    path: string,
    {
      color = K.blue,
      rev = false,
      slow = false,
      label,
      lx,
      ly,
      anchor = "start",
      labelFill,
      over = false,
    }: ArrowOptions = {},
  ): void {
    const m = this.marker(color);
    const layer = over ? this.top : this.under;
    layer.push(`<path class="rail" stroke="${color}" d="${path}" marker-end="url(#${m})"/>`);
    layer.push(
      `<path class="flow${rev ? " rev" : ""}${slow ? " slow" : ""}" stroke="${color}" d="${path}"/>`,
    );
    if (label && lx !== undefined && ly !== undefined)
      this.label(lx, ly, label, { fill: labelFill || color, anchor });
  }

  label(
    x: number,
    y: number,
    str: string,
    { fill = K.navy, anchor = "start" }: LabelOptions = {},
  ): void {
    this.top.push(
      `<text class="lab" x="${x}" y="${y}" fill="${fill}"${anchor !== "start" ? ` text-anchor="${anchor}"` : ""}>${esc(str)}</text>`,
    );
  }

  note(
    x: number,
    y: number,
    str: string,
    { fill = K.mute, anchor = "start", size = 13.5, weight = 400 }: TextOptions = {},
  ): void {
    this.top.push(
      `<text class="note" x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}"${anchor !== "start" ? ` text-anchor="${anchor}"` : ""}>${esc(str)}</text>`,
    );
  }

  badge(n: number, x: number, y: number, color: string): void {
    this.top.push(
      `<g class="badge" data-n="${n}"><circle cx="${x}" cy="${y}" r="12" fill="${color}" stroke="#fff" stroke-width="2"/><text x="${x}" y="${y + 4.5}" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">${n}</text></g>`,
    );
  }

  // One step of the story: highlight boxes, a token along a path, a caption, a badge ring.
  step({ n, color, caption, hl = [], token, badge, w = 1 }: Step): void {
    this.steps.push({ n, color, caption, hl, token, badge, w });
    if (badge) this.badge(n, badge[0], badge[1], color);
  }

  window(i: number): [number, number] {
    const total = this.steps.reduce((s, x) => s + x.w, 0);
    const start = 0.03,
      span = 0.87;
    let t = start;
    for (let j = 0; j < i; j++) t += (this.steps[j].w / total) * span;
    return [t, t + (this.steps[i].w / total) * span];
  }

  // SMIL: show for [a, b] of the loop, hidden otherwise.
  show(a: number, b: number): string {
    return `<animate attributeName="opacity" dur="${this.period}s" repeatCount="indefinite" calcMode="discrete" values="0;1;0" keyTimes="0;${f4(a)};${f4(b)}"/>`;
  }

  overlay(): string {
    const out = [];
    this.steps.forEach((s, i) => {
      const [a, b] = this.window(i);
      for (const [x, y, w, h] of s.hl) {
        out.push(
          `<rect class="hl" x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}" rx="24" fill="none" stroke="${s.color}" stroke-width="3" opacity="0">${this.show(a, b)}</rect>`,
        );
      }
      if (s.badge)
        out.push(
          `<circle class="hl" cx="${s.badge[0]}" cy="${s.badge[1]}" r="18" fill="none" stroke="${s.color}" stroke-width="3" opacity="0">${this.show(a, b)}</circle>`,
        );
      if (s.token) {
        const len = b - a;
        const ts = a + len * 0.1,
          te = a + len * 0.8;
        out.push(
          `<g class="mover" opacity="0">${this.show(a, b)}<circle r="16" fill="${s.color}" opacity=".18"/><circle r="8" fill="${s.color}" stroke="#ffffff" stroke-width="3"/>` +
            `<animateMotion dur="${this.period}s" repeatCount="indefinite" path="${s.token}" keyPoints="0;0;1;1" keyTimes="0;${f4(ts)};${f4(te)};1" calcMode="spline" keySplines="0 0 1 1;0.45 0 0.2 1;0 0 1 1"/></g>`,
        );
      }
      out.push(
        `<g class="cap" opacity="0">${this.show(a, b)}<circle cx="64" cy="96" r="15" fill="${s.color}"/><text x="64" y="101" text-anchor="middle" font-size="14" font-weight="800" fill="#ffffff">${s.n}</text>` +
          `<text x="90" y="102" font-size="17" font-weight="700" fill="${K.ink}">${esc(s.caption)}</text></g>`,
      );
    });
    for (const fn of this.extras) out.push(fn(this));
    return out.join("\n");
  }

  render(): string {
    const H = this.height;
    const marks = [...this.markers]
      .map(
        ([id, c]) =>
          `<marker id="${id}" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" refX="12" refY="7" orient="auto"><path d="M1 1 L13 7 L1 13 z" fill="${c}"/></marker>`,
      )
      .join("\n  ");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 ${H}" width="1280" height="${H}" role="img" aria-labelledby="t d">
<title id="t">${esc(this.title)}</title>
<desc id="d">${esc(this.desc)}</desc>
<style>
  text{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
  .s{font-size:13.5px;fill:#4c5260}
  .lab{font-size:12.5px;font-weight:700;paint-order:stroke;stroke:#f1f5fc;stroke-width:5px;stroke-linejoin:round}
  .note{paint-order:stroke;stroke:#f1f5fc;stroke-width:4px;stroke-linejoin:round}
  .flow{fill:none;stroke-width:3;stroke-linecap:round;stroke-dasharray:2 12;animation:flow 1.4s linear infinite}
  .rev{animation-direction:reverse}
  .slow{animation-duration:2.4s}
  .rail{fill:none;stroke-width:3;stroke-opacity:.18}
  .pulse{animation:pulse 2.8s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
  @keyframes flow{to{stroke-dashoffset:-28}}
  @keyframes pulse{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:.9;transform:scale(1.35)}}
  @media (prefers-reduced-motion:reduce){.flow,.pulse{animation:none}.mover,.hl,.prog,.cap,.anim{display:none}}
</style>
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef3fd"/><stop offset="1" stop-color="#f7f9fd"/></linearGradient>
  <linearGradient id="navy" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a2a7a"/><stop offset="1" stop-color="#071c57"/></linearGradient>
  <filter id="sh" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#0a1e50" flood-opacity=".10"/></filter>
  ${marks}
</defs>
<rect width="1280" height="${H}" rx="28" fill="url(#bg)"/>
<text x="48" y="58" font-size="15" font-weight="800" fill="${K.navy}" letter-spacing="1">${esc(this.heading)}</text>
<text x="1232" y="58" class="s" text-anchor="end">${esc(this.sub)}</text>
${this.under.join("\n")}
${this.cards.join("\n")}
${this.top.join("\n")}
<g id="steps">
${this.overlay()}
</g>
<rect class="prog" x="48" y="114" width="600" height="4" rx="2" fill="${K.navy}" opacity=".1"/><rect class="prog" x="48" y="114" width="600" height="4" rx="2" fill="${K.navy}"><animate attributeName="width" dur="${this.period}s" repeatCount="indefinite" values="0;600;600" keyTimes="0;0.9;1"/></rect>
</svg>
`;
  }
}
