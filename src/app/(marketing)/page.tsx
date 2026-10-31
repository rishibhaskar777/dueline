import type { Metadata } from "next";
import { BuiltOnPayPal } from "@/components/landing/BuiltOnPayPal";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { WhyDueline } from "@/components/landing/WhyDueline";

export const metadata: Metadata = {
  title: { absolute: "Dueline: get paid by clients abroad" },
  description:
    "Dueline shows Indian freelancers what their PayPal invoices will pay in rupees, flags clients who pay late and keeps export paperwork ready.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-ground">
      <Hero />
      <main>
        <WhyDueline />
        <HowItWorks />
        <BuiltOnPayPal />
      </main>
      <LandingFooter />
    </div>
  );
}
