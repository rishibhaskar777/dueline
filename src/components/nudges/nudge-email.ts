// The freelancer's own email for a reminder: the drafted subject and message, to the client, with the
// invoice's PayPal pay link as the last paragraph of the body, before the sign-off. The pay link is the only link a message may hold,
// and it is added here, after the link check, in code.

// Long mailto links break in some email apps and browsers, so past this only Gmail and Copy are offered.
export const MAILTO_MAX_LENGTH = 1800;

const SENTENCE_END = /[.!?]$/;

// Drafts end with a sign-off block: a short closing line ("Thank you,") and the sender's name lines,
// with no blank line between them. A message without one is all body.
function splitSignOff(message: string): { body: string; signOff: string } {
  const paragraphs = message.trimEnd().split(/\n{2,}/);
  const last = paragraphs.at(-1) ?? "";
  const lines = last.split("\n");
  const [closing, ...names] = lines;
  const looksLikeSignOff =
    paragraphs.length >= 2 &&
    names.length > 0 &&
    closing.length <= 40 &&
    !SENTENCE_END.test(closing) &&
    lines.every((line) => line.length <= 60);
  return looksLikeSignOff
    ? { body: paragraphs.slice(0, -1).join("\n\n"), signOff: last }
    : { body: message.trimEnd(), signOff: "" };
}

// The pay link is the last paragraph of the body, so the sign-off still closes the message.
export function withPayLink(message: string, payLink: string): string {
  if (!payLink) return message.trimEnd();
  const { body, signOff } = splitSignOff(message);
  return [body, `Pay here: ${payLink}`, signOff].filter((part) => part !== "").join("\n\n");
}

// Line breaks are kept as CRLF, which is what a mailto body expects.
export function mailtoUrl(to: string, subject: string, body: string): string {
  const crlf = body.replace(/\r?\n/g, "\r\n");
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(crlf)}`;
}

export function gmailUrl(to: string, subject: string, body: string): string {
  const query = [
    "view=cm",
    "fs=1",
    `to=${encodeURIComponent(to)}`,
    `su=${encodeURIComponent(subject)}`,
    `body=${encodeURIComponent(body)}`,
  ];
  return `https://mail.google.com/mail/?${query.join("&")}`;
}

interface EmailLinks {
  body: string;
  gmail: string;
  // Null when the link would be too long to rely on.
  mailto: string | null;
}

export function emailLinks(
  to: string,
  subject: string,
  message: string,
  payLink: string,
): EmailLinks {
  const body = withPayLink(message, payLink);
  const mailto = mailtoUrl(to, subject, body);
  return {
    body,
    gmail: gmailUrl(to, subject, body),
    mailto: mailto.length > MAILTO_MAX_LENGTH ? null : mailto,
  };
}

interface EmailPreview {
  to: string;
  subject: string;
  // The body as the email will hold it: the message's paragraphs with the Pay here line before the
  // sign-off.
  paragraphs: string[];
}

// What "Send my message" fills into the email. It is built from the same body as the links, so the
// preview cannot say something the email does not. Email apps lay a message out their own way, so
// this is an approximation of how it looks, not of what it says.
export function previewEmail(
  to: string,
  subject: string,
  message: string,
  payLink: string,
): EmailPreview {
  return {
    to,
    subject,
    paragraphs: withPayLink(message, payLink)
      .split(/\n{2,}/)
      .filter((paragraph) => paragraph.trim() !== ""),
  };
}
