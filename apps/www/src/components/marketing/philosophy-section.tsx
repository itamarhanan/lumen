"use client";

import { useState } from "react";

const pillars = [
  {
    label: "Privacy",
    title: "Cookieless by design, not by toggle.",
    body: "There is no consent banner because there is nothing to consent to. No third-party scripts, no fingerprinting, no cross-site identifiers. Your users' data never leaves the context of your product.",
  },
  {
    label: "Flexibility",
    title: "Your schema. Your taxonomy.",
    body: "Lumen doesn't impose a pre-built event model. You name your events, define your properties, and query exactly what your product produces — not a watered-down approximation of it.",
  },
  {
    label: "Ownership",
    title: "Infrastructure sovereignty, always.",
    body: "Self-host on your own infrastructure, export at any time, delete on demand. Cloud is available for convenience. But the data is yours — structurally, legally, and operationally.",
  },
];

export function PhilosophySection() {
  const [open, setOpen] = useState<number | null>(null);

  const toggle = (i: number) => setOpen(open === i ? null : i);

  return (
    <section className="py-24 md:py-36 px-5 border-t border-border">
      <div className="mx-auto max-w-5xl">
        <span className="mb-5 inline-flex w-full justify-center text-center items-center rounded-full  py-1 text-xs uppercase tracking-widest text-muted-foreground">
          Our philosophy
        </span>
        <h2 className="text-center text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-snug text-balance text-foreground">
          Analytics built on principles
        </h2>
        <p className="mx-auto text-center mt-4 max-w-2xl text-base md:text-base text-muted-foreground leading-relaxed mb-16 md:mb-20">
          Every decision in Lumen flows from three commitments — to your
          users&apos; privacy, to your team&apos;s autonomy, and to your right
          to own the systems you depend on.
        </p>

        <div>
          {pillars.map((p, i) => {
            const isOpen = open === i;
            return (
              <div key={p.label}>
                {i > 0 && <hr className="border-border" />}
                <button
                  onClick={() => toggle(i)}
                  className="w-full text-left py-6 md:py-8 group"
                >
                  <div className="flex items-start gap-4">
                    <span className="pt-0.5 w-6 shrink-0 text-xs font-mono tabular-nums text-muted-foreground/40">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs uppercase tracking-widest text-muted-foreground">
                        {p.label}
                      </span>
                      <h3 className="mt-1 text-base md:text-lg font-medium text-foreground leading-snug text-balance">
                        {p.title}
                      </h3>
                    </div>
                    <span
                      className={`shrink-0 pt-0.5 text-sm text-muted-foreground/30 transition-transform duration-300 ${
                        isOpen ? "rotate-45" : ""
                      }`}
                    >
                      +
                    </span>
                  </div>

                  <div
                    className="grid overflow-hidden transition-all duration-300"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <p className="pt-4 pl-10 text-sm md:text-base text-muted-foreground leading-relaxed max-w-lg">
                        {p.body}
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
