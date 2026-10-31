import type { Profile } from "@/types";

// A model that signs off anyway would otherwise leave two closings.
const TRAILING_CLOSING = /\n+\s*(?:thank you|thanks|regards|best regards|kind regards)[,.!]?\s*$/i;

// The longest closing the profile allows (40 + 60 characters and the line breaks), so a signed
// message still fits the length the send route accepts.
export const SIGN_OFF_ROOM = 110;

// Every reminder ends the same way, whoever wrote the body: the sign-off, then the name on its own
// line. With no name only the sign-off is written; a name is never invented.
export function withSignOff(body: string, { signOff, yourName }: Profile): string {
  const closing = yourName ? `${signOff},\n${yourName}` : signOff;
  return `${body.trim().replace(TRAILING_CLOSING, "")}\n\n${closing}`;
}
