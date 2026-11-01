import { describe, expect, it } from "vitest";
import {
  emailLinks,
  gmailUrl,
  MAILTO_MAX_LENGTH,
  mailtoUrl,
  withPayLink,
} from "@/components/nudges/nudge-email";
import { historyLabel } from "@/components/nudges/nudge-model";

const PAY_LINK = "https://www.sandbox.paypal.com/invoice/p/#ABC123";
const message = "Hi Sam,\n\nInvoice INV-1 is overdue.\n\nThank you,\nRiya";

describe("withPayLink", () => {
  it("puts the pay link as the last paragraph of the body, before the sign-off", () => {
    expect(withPayLink(`${message}\n`, PAY_LINK)).toBe(
      `Hi Sam,\n\nInvoice INV-1 is overdue.\n\nPay here: ${PAY_LINK}\n\nThank you,\nRiya`,
    );
  });

  it("finds a sign-off of any wording, with a business name ending in a full stop", () => {
    const text =
      "Hallo Sam,\n\nRechnung INV-1 ist überfällig.\n\nVielen Dank,\nRiya\nRiya Designs Co.";
    expect(withPayLink(text, PAY_LINK)).toBe(
      `Hallo Sam,\n\nRechnung INV-1 ist überfällig.\n\nPay here: ${PAY_LINK}\n\nVielen Dank,\nRiya\nRiya Designs Co.`,
    );
  });

  it("adds the link at the end when the message has no sign-off block", () => {
    expect(withPayLink("Hi Sam,\n\nPlease pay INV-1 this week.", PAY_LINK)).toBe(
      `Hi Sam,\n\nPlease pay INV-1 this week.\n\nPay here: ${PAY_LINK}`,
    );
    expect(withPayLink("One short line.", PAY_LINK)).toBe(
      `One short line.\n\nPay here: ${PAY_LINK}`,
    );
  });

  it("adds nothing when the invoice has no pay link", () => {
    expect(withPayLink(message, "")).toBe(message);
  });
});

describe("mailtoUrl", () => {
  it("encodes the address, subject and body, and keeps line breaks as %0D%0A", () => {
    const url = mailtoUrl("ana+bill@client.example", "Invoice & more", "Line one\nLine two");
    expect(url).toBe(
      "mailto:ana%2Bbill%40client.example?subject=Invoice%20%26%20more&body=Line%20one%0D%0ALine%20two",
    );
  });

  it("does not double a break that is already CRLF", () => {
    expect(mailtoUrl("a@b.example", "s", "a\r\nb")).toContain("body=a%0D%0Ab");
  });
});

describe("gmailUrl", () => {
  it("opens Gmail's compose window with to, su and body encoded", () => {
    const url = new URL(gmailUrl("a@b.example", "Invoice & more", "One\nTwo # three"));
    expect(url.origin + url.pathname).toBe("https://mail.google.com/mail/");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      view: "cm",
      fs: "1",
      to: "a@b.example",
      su: "Invoice & more",
      body: "One\nTwo # three",
    });
  });
});

describe("emailLinks", () => {
  it("builds the body with the pay link and both links for a short message", () => {
    const links = emailLinks("a@b.example", "Subject", message, PAY_LINK);

    expect(links.body.endsWith("Thank you,\nRiya")).toBe(true);
    expect(links.body.indexOf("Pay here:")).toBeLessThan(links.body.indexOf("Thank you,"));
    expect(links.body).toBe(withPayLink(message, PAY_LINK));
    expect(links.mailto).toContain("Pay%20here%3A%20https%3A%2F%2Fwww.sandbox.paypal.com");
    expect(links.gmail.startsWith("https://mail.google.com/mail/?view=cm&fs=1&to=")).toBe(true);
  });

  it("leaves out the mailto link, but not Gmail, once it would pass 1,800 characters", () => {
    const long = `Hi Sam,\n\n${"Please pay the invoice soon. ".repeat(60)}`;
    const links = emailLinks("a@b.example", "Subject", long, PAY_LINK);

    expect(mailtoUrl("a@b.example", "Subject", links.body).length).toBeGreaterThan(
      MAILTO_MAX_LENGTH,
    );
    expect(links.mailto).toBeNull();
    expect(links.gmail).toContain("mail.google.com");
  });

  it("keeps a message just under the limit", () => {
    const links = emailLinks("a@b.example", "Subject", "Short.", "");
    expect(links.mailto).not.toBeNull();
    expect(links.mailto?.length).toBeLessThanOrEqual(MAILTO_MAX_LENGTH);
  });
});

describe("historyLabel for the freelancer's own email", () => {
  it("says the message was sent from the email", () => {
    expect(historyLabel({ tone: "firm", sentAt: "2026-10-31T06:00:00Z", channel: "email" })).toBe(
      "Firm message sent from your email 31 Oct",
    );
  });
});
