// The freelancer's own email for a reminder: the drafted subject and message, to the client, with the
// invoice's PayPal pay link as the last paragraph. The pay link is the only link a message may hold,
// and it is added here, after the link check, in code.

// Long mailto links break in some email apps and browsers, so past this only Gmail and Copy are offered.
export const MAILTO_MAX_LENGTH = 1800;

export function withPayLink(message: string, payLink: string): string {
  return payLink ? `${message.trimEnd()}\n\nPay here: ${payLink}` : message.trimEnd();
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
