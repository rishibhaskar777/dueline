import type { ReactNode } from "react";

interface SendPanelProps {
  title: string;
  children: ReactNode;
}

// One way of getting the reminder to the client, in the column beside the draft.
export function SendPanel({ title, children }: SendPanelProps) {
  return (
    <section className="grid content-start gap-2.5 rounded-[20px] bg-inner p-5">
      <h3 className="font-heading text-lg font-extrabold">{title}</h3>
      {children}
    </section>
  );
}
