import { storyMarkerOf } from "./story";

export interface VisibilityInput {
  id: string;
  // The first word of the invoice's private memo.
  marker: string;
  // PayPal's status.
  status: string;
}

const DUELINE_MARKER = "dueline-";
const REQUEST_MARKER = "dueline-request:";

// In the demo a judge should see the story as it is dated today, what they made through Dueline, and
// real payments. An older story generation is history that PayPal cannot remove, and an invoice made
// in PayPal's own dashboard is not Dueline's. A payment through PayPal is the strongest proof, so a
// paid invoice with any Dueline marker stays whatever its generation.
export function isShownInDemo(
  invoice: VisibilityInput,
  generation: number,
  hiddenIds: ReadonlySet<string>,
): boolean {
  if (hiddenIds.has(invoice.id) || invoice.status === "CANCELLED") return false;
  if (!invoice.marker.startsWith(DUELINE_MARKER)) return false;
  if (invoice.status === "PAID") return true;

  const story = storyMarkerOf(invoice.marker);
  return story ? story.generation === generation : invoice.marker.startsWith(REQUEST_MARKER);
}
