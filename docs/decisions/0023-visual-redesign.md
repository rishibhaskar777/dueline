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
