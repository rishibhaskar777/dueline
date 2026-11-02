"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChoiceCardView } from "./LandingCards";
import { LANDING_CHOICES } from "./landing-choices";
import { SitePill } from "./SitePill";

// The black section. Hovering, focusing or clicking a heading chooses it; nothing changes by itself.
export function ChoiceSection() {
  const [chosen, setChosen] = useState(0);
  const choice = LANDING_CHOICES[chosen];

  return (
    <section aria-labelledby="choices-title" className="bg-black text-white">
      <h2 id="choices-title" className="sr-only">
        What Dueline does
      </h2>
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-14 px-4 py-20 md:px-6 md:py-28">
        <div className="flex flex-[1_1_440px] flex-col gap-1">
          <div role="group" aria-label="What Dueline does" className="flex flex-col items-start">
            {LANDING_CHOICES.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={index === chosen}
                onMouseEnter={() => setChosen(index)}
                onFocus={() => setChosen(index)}
                onClick={() => setChosen(index)}
                className={cn(
                  "rounded-2xl text-left font-heading text-[40px] leading-[1.08] font-extrabold tracking-[-1.2px] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none md:text-[64px] md:tracking-[-1.8px]",
                  index === chosen ? "text-white" : "text-white/40",
                )}
              >
                {item.title}
              </button>
            ))}
          </div>
          <p
            key={choice.id}
            aria-live="polite"
            className="dl-fade mt-9 mb-5 max-w-[470px] text-xl leading-relaxed text-[#e4e6eb]"
          >
            {choice.sentence}
          </p>
          <SitePill href="/features" variant="glass" small className="self-start px-6 py-3.5">
            All features →
          </SitePill>
        </div>
        <div key={choice.card} className="dl-fade flex-[1_1_420px] md:min-h-[390px]">
          <ChoiceCardView card={choice.card} />
        </div>
      </div>
    </section>
  );
}
