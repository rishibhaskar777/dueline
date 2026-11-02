# 0023. A visual redesign: glass surfaces and new fonts

## Status

Accepted.

## Context

The app worked but looked like a default component kit: flat white cards on a grey ground, square
buttons, condensed headings. The redesign gives every screen one look, in light and dark. This first
phase builds the design system and applies it to the existing screens without moving anything; the
sidebar, page layouts and landing page follow in later phases.

## Decision

**Fonts.** Outfit (500 to 800) for headings and big figures and Figtree (400 to 700) for the rest,
loaded with `next/font/google`, so they are downloaded at build time and served from the app itself.
The Content Security Policy keeps allowing only `'self'` for fonts.

**Tokens.** Every existing token name stays, in plain `#rrggbb`, because the contrast test reads the
stylesheet as hex. Translucent values (glass, button, tint and track colours) are separate `rgba`
tokens that components use through Tailwind colours. `--card` stands for a frosted surface once it is
blended with the page, so text contrast is checked against it. The test also checks text on
`secondary`, the soft fill behind chips.

**Glass surfaces.** `surface` is the frosted card, `surface-strong` is for menus, popovers, dialogs,
toasts and the due line's hover card, and `glass-track` and `glass-indicator` draw tabs and segmented
controls. A browser without `backdrop-filter` gets `--card` or `--popover` as a solid background, so
text stays readable. A surface with `backdrop-filter` becomes the containing block of its `fixed`
children, so the due line's hover card is rendered into `document.body`.

**Backdrop in CSS only.** `Backdrop` is a server component with no state. The colours, opacities and
dot colour are variables, so switching theme needs no script. The glows, the dots' breathing and the
grain (an inline SVG `feTurbulence` filter) live in `globals.css`. The box uses `contain: strict` and
`overflow: hidden`, and only the glows set `will-change`.

**Reduced motion.** Under `prefers-reduced-motion` the glows and dots have `animation: none`, so
nothing moves and nothing jumps to an end state. The sliding pill drops its transition and does not
animate its first placement.

**Not copying PayPal.** The product sits next to PayPal and shares its feel: soft glass, pills and
generous radii. It uses its own fonts, colours, wordmark and logo, so nobody mistakes it for a PayPal
product.

## Consequences

- Every card, button, field, badge and dialog changes look from one place; screens did not change.
- The blurred glows over the whole page and `backdrop-filter` on many cards cost paint time on weak
  devices. The solid fallback and reduced motion help; if it shows, the glows can be limited to the
  top of the page.
- The card headings use one unlayered rule (`.surface h2`) so the old utility classes on them no
  longer decide the size; a heading that needs another size sets `--h2-size`.

## App frame

The sidebar is replaced by a top bar on every app page (`AppBar`, `MainTabs`, `AccountMenu`).

- **Top bar instead of a sidebar.** Five tabs in one glass track (Home, New invoice, Clients, Nudges
  with its overdue count, Export register), then search, the theme switch and the account button.
  Profile, Fees and rates and Demo tools are less used, so they moved into the account menu, with the
  connection status and "Lock demo". The page gets the full width, up to 1280 px of content.
- **Home.** The Receivables page is called Home in the bar and in the command palette ("Go to
  Home"; "receivables" is still a search keyword). Its URL is still `/receivables`. An invoice's own
  page belongs to Home, `/invoices/new` to New invoice, and Profile, Fees and rates and Demo tools
  have no active tab, so the sliding pill is hidden there.
- **The menu is portalled.** `AccountMenu` uses the Base UI `Menu` with a portal. A `backdrop-filter`
  only blurs what is behind the element inside its own backdrop root, and the bar is one, so a menu
  inside it would blur nothing. Portalled to `document.body`, its `surface-strong` glass blurs the
  page. Base UI gives arrow keys,
  Escape, outside click and focus back to the button.
- **Phone tab row.** Below 768 px the bar has two rows: the wordmark with search, theme and account,
  then the tab track at full width. The track scrolls sideways inside itself with its scrollbar
  hidden, snaps to tabs and scrolls the current tab into view. There is no menu button. From 768 px
  the bar is one line; on a narrow tablet (768 to 839 px) the word beside the mark and the tabs'
  padding give way first, and search is an icon below 1024 px.
- **Tokens.** `--bar`, `--bar-line` and `--bar-solid` (the bar blended with the page, used by the
  contrast test and as the fallback without `backdrop-filter`). The `sidebar-*` tokens and the
  on-dark status colours are gone. The overdue pill is `#d1322a` with white text in the light theme;
  in the dark theme it is `#ff6b61` with near-black text, because white on that red is 2.8:1.
- **Anchors.** The bar is sticky and in the flow, so the content starts below it, and
  `scroll-padding-top` keeps anchor jumps (`/nudges#invoice-…`) from landing under it.

## Home

- **Greeting.** The heading reads "Good morning", "Good afternoon" or "Good evening" by the hour in
  Asia/Kolkata, with the first word of the profile name. The hour is read in the browser after the
  page mounts, so the server and first render say "Good day" in the same box. The date line comes
  from the health answer (which follows the demo clock) and replaces the old "Demo date" line.
- **Condensed checklist.** Getting started is one strip with a progress bar and the next undone step;
  "See all steps" opens the full list. Its region is still named "Getting started" or "All set".
- **Rate line inside the fees card.** The rates widget is hidden by default; the rate of the currency
  with the most rupees outstanding (USD when none), its comparison with the 30-day average and any
  triggered alert are one line of What getting paid costs. The longer explanation is behind "How this
  is worked out".
- **Forecast.** The three buckets are separate windows, so the card shows the next 30 days with a bar
  of expected over best case, and the best case of days 31 to 90 as one sentence. The basis sentence
  stays as small print.
- **One colour per due-line row**, as drawn in the design, instead of a blue then red line, and a
  label column instead of labels placed beside the end dot. `label-placement.ts` is gone.
- **Phones.** Each due-line row stacks the client name, the line and the label.
- **Clients behind.** The late clients region is named "Clients behind". Under each name it says
  "Late on 3 of 3 · 12 days on average", from `lateCount`, `invoicesConsidered` and
  `averageDaysLate`, which `LateClient` now carries; the average is left out when it is 0.
- **No Days late column.** The overdue days are in the Status pill, so the column and its sort are
  gone; sort by Due instead.
- **Filter.** The invoice filter is the shared segmented control with four options; the "Unpaid"
  option is gone.
- **Default layout.** The designed layout is stored under `dueline.layout.v2`, so everyone sees it once;
  a layout saved under v1 is ignored.

## Clients and invoice pages

- **Cards instead of the table.** `/clients` is a grid of cards (three columns from 1024 px, two from
  768 px, one below). A card shows everything the table did except Last paid, which only appears in the
  card's bottom line when there is no risk reason to say. The AG Grid table, its columns and its phone
  card list are gone, so one layout serves every width and the whole card is one link. The search pill now
  also matches email. Clients are ordered by what they owe, then by name.
- **Client page.** The reason is a full-width strip tinted by the risk level, with the offer the radar
  suggests; there is no strip for a client with no level. The tone is not on this page's data, so only the
  offer is written. Totals reuse the Home `TotalCard`.
- **Back link and header actions.** The invoice page's back link is "Home", as the tab is called. The payer
  link, copy and reminder buttons move from the Actions card to the header and show on the same conditions as
  before (`headerActions`); Actions keeps Duplicate, Repeat monthly, Record a payment, Hide from the demo and
  Cancel. The cancel question is a red panel in the card, with the same wording and buttons.
- **Lateness in the list.** On the client page only, an invoice paid late says so in its pill ("Paid · 3 days
  late", "Paid outside PayPal · 16 days late"), from `clientStatusLabel`. Home and the invoice page keep their
  wording.
- **History.** A vertical timeline with a dot per kind of event (`timelineDot`).

## New invoice and Nudges

- **Step header.** The step pill shows where you are and is not a control: the app has no way back from the
  review step that keeps your edits, so it is not a button. The heading changes with the step, and the sent
  result is its own page with its own h1.
- **Notices as pills.** What the privacy filter hid is green; every note and warning from reading the chat is
  amber. The text and data are the same as the old panel's.
- **Discount inside Details.** The early-payment discount is two rows of the Details card, not a card of its
  own. The late-payer radar is a strip in the risk tone and still fills that discount.
- **Item rows.** Items are rows of fields with one header row when the card is 768 px wide; narrower, each row
  wraps to two lines and shows its labels. The card decides (a container query), not the screen, because beside
  the summary it is only about 530 px wide on a 1024 px laptop. The Client and Details fields stack the same way.
- **Two action panels.** A nudge offers PayPal's reminder and the freelancer's own message as two panels
  beside the draft. When PayPal's reminder has gone today the button is replaced by a note saying so; the
  email panel keeps its confirm step ("I sent it") and its sent-today note.
- **Email preview.** "Preview" opens the email across the whole nudge card, below the draft and the action
  column, so the message is not squeezed into the 300 px column. The card owns the open state; the button keeps
  its toggle label and `aria-controls`.
- **Shared tone control.** The tone switch is the shared `Segmented` control, which gained a `disabled`
  option. The suggested tone reads "Firm · suggested", shortened to a dot on a phone with the words kept for
  screen readers.

## App pages, the website and the theme switch

- **App pages.** Export register, Profile, Fees and rates, Demo tools, the 404 page and the not-configured page
  take the same cards, pills and fields. The register's four totals reuse `TotalCard`; its tables use the
  shared `tableGridTheme`. The profile and settings pages are a form beside a 360 px column and stack below
  1024 px. The fees page gained a "Vs 30-day average" column, read from the existing dashboard rates.
- **Site layout and nav.** The public pages share one layout with `SiteNav` and a one-line footer. The nav reuses
  the app bar's sliding indicator, and "Open the demo" always goes to `/receivables`, which the password page
  intercepts, so the visitor lands on Home after signing in.
- **Landing choices.** The three headings of the black section are buttons (`aria-pressed`) that change on hover,
  focus or click and never by themselves. The three choices are data in `landing-choices.ts`. The inactive
  headings are 40% white rather than 35%, because 35% fails the 3:1 contrast check for large text.
- **Sign-in split.** The navy half is decorative apart from the logo link; on screens narrower than 1280 px it
  becomes a short band without the floating cards.
- **Instant theme switch.** The circle reveal needed view transitions and a second animation on top of the
  colour fades. Most product sites switch instantly, which is calmer and cannot look broken on a slow device, so
  the switch now suppresses all transitions for one frame and changes the class.
