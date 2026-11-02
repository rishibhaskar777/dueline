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
