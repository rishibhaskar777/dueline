# 0012. A hand-built due line

## Status

Accepted.

## Context

The due line draws every invoice as a line from the day it was sent to the day it was paid, or to
today. It needs a shared time axis, a "Today" marker, a tick at each due date, a colour change at the
due date and a row that can be focused and read aloud. Chart libraries are built for series of
numbers, so each of these would be a plugin or a workaround, and a library would add a dependency
for one chart. The project avoids new dependencies without a clear need.

## Decision

The chart is plain SVG written in React. The maths (axis, week ticks, segments and colours per
invoice, the words beside each line) is a pure function in `due-line-layout.ts` that returns
positions as fractions of the axis. The SVG uses percentage coordinates, so it fills whatever width
the card has, and scrolls sideways inside the card on narrow screens. The tooltip is positioned in
the page, not inside the scrolling card, so it is not clipped.

## Consequences

The layout is covered by unit tests without a browser. Every row is a real focusable element with a
spoken description, which a canvas or a library's default output would not give us. We own the
drawing code, so a new kind of mark means editing it by hand. If the chart ever needs zooming or
live brushing, this decision should be revisited.
