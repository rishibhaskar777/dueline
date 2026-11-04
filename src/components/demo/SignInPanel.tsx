import Link from "next/link";
import { SignInDueDates } from "@/components/demo/SignInDueDates";
import { Wordmark } from "@/components/layout/Wordmark";

const MINI =
  "absolute flex flex-col gap-2 rounded-[22px] border border-white/18 bg-white/10 px-5 py-[18px] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_20px_40px_rgba(0,0,20,0.25)] backdrop-blur-xl";

// The navy half of the sign-in page. Only the logo is a link; the floating cards are a picture of
// what the demo holds, so they are hidden from assistive technology.
export function SignInPanel() {
  return (
    <aside className="relative isolate flex flex-col justify-between overflow-hidden bg-[image:var(--sign-panel)] px-6 py-6 text-white max-xl:gap-4 xl:flex-[56] xl:px-14 xl:py-10">
      <span
        aria-hidden="true"
        className="dl-glow absolute -top-[200px] -left-40 -z-10 size-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(91,155,255,0.55),rgba(91,155,255,0))]"
      />
      <span
        aria-hidden="true"
        className="dl-glow absolute -right-36 -bottom-40 -z-10 size-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(124,200,255,0.35),rgba(124,200,255,0))] [animation-delay:-9s]"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(rgba(255,255,255,0.14)_1px,transparent_1px)] bg-[length:26px_26px] [mask-image:linear-gradient(180deg,#000_0%,transparent_75%)]"
      />

      <Link
        href="/"
        className="self-start rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <Wordmark tone="inverse" />
      </Link>

      <div aria-hidden="true" className="relative my-5 hidden h-[380px] xl:block">
        <div className={`${MINI} dl-float-a top-5 left-0 w-[300px]`}>
          <div className="flex items-center justify-between">
            <span className="text-sm opacity-80">Tandem Health · 0005</span>
            <span className="rounded-full bg-[rgba(52,194,122,0.25)] px-2.5 py-1 text-xs font-bold text-[#9ff0c4]">
              Paid
            </span>
          </div>
          <span className="font-heading text-[34px] font-extrabold tracking-[-0.8px]">₹79,049</span>
          <span className="text-[13px] opacity-75">Reached your bank after PayPal’s fee</span>
        </div>
        <div className={`${MINI} dl-float-b top-0 right-2.5 w-[250px]`}>
          <span className="text-sm opacity-80">Okafor &amp; Reyes · 0019</span>
          <span className="font-heading text-xl font-bold">Reminder sent</span>
          <span className="text-[13px] text-[#ffc266]">8 days late · firm tone</span>
        </div>
        <div className={`${MINI} dl-float-c bottom-0 left-[90px] w-[380px]`}>
          <div className="flex justify-between">
            <span className="text-sm opacity-80">Brightwell Labs · 0023</span>
            <span className="text-[13px] font-bold text-[#9cc4ff]">Due in 2 days</span>
          </div>
          <div className="relative mt-1.5 h-2 rounded-lg bg-white/14">
            <span className="dl-bar absolute inset-y-0 left-0 w-[88%] rounded-lg bg-[linear-gradient(90deg,#5b9bff,#9cc4ff)]" />
            <span className="absolute top-1/2 left-[88%] -mt-[7px] -ml-[7px] size-3.5 rounded-full bg-white shadow-[0_0_0_4px_rgba(156,196,255,0.35)]" />
          </div>
          <SignInDueDates />
        </div>
      </div>

      <div className="flex max-w-[560px] flex-col gap-3.5">
        <p className="font-heading text-[32px] leading-[1.06] font-extrabold tracking-[-1px] xl:text-[52px] xl:tracking-[-1.6px]">
          Every invoice, from sent to rupees.
        </p>
        <p className="hidden text-lg leading-relaxed opacity-80 xl:block">
          Real PayPal sandbox invoices and sample clients, ready to explore.
        </p>
      </div>
    </aside>
  );
}
