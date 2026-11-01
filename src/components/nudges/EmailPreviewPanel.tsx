import { previewEmail } from "./nudge-email";

interface EmailPreviewPanelProps {
  id: string;
  to: string;
  subject: string;
  message: string;
  payLink: string;
}

// The personal email as "Send my message" will fill it in. Email apps may lay it out a little
// differently, and PayPal's own reminder is a different email in PayPal's wording.
export function EmailPreviewPanel({ id, to, subject, message, payLink }: EmailPreviewPanelProps) {
  const { paragraphs } = previewEmail(to, subject, message, payLink);
  return (
    <section
      id={id}
      aria-label="Email preview"
      className="grid gap-3 rounded-lg border border-line bg-ground p-4 text-sm"
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">To</dt>
        <dd className="break-all">{to}</dd>
        <dt className="text-muted-foreground">Subject</dt>
        <dd className="font-medium">{subject}</dd>
      </dl>
      <div className="grid gap-3 border-t border-line pt-3">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="break-words whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>
      <p className="border-t border-line pt-3 text-muted-foreground">
        PayPal&apos;s own reminder uses PayPal&apos;s standard wording, not this message.
      </p>
    </section>
  );
}
