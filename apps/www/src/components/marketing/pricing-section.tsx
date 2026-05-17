"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PricingSection() {
  const [yearly, setYearly] = useState(false);

  return (
    <section
      id="pricing"
      className="py-24 md:py-32 px-5 border-t border-border"
    >
      <div className="mx-auto max-w-5xl">
        <span className="w-full mx-auto text-center justify-center mb-5 inline-flex items-center px-3 py-1 text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Pricing
        </span>
        <h2 className="w-full text-center text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-snug text-balance text-foreground">
          Two honest options. No dark patterns.
        </h2>
        <p className="mx-auto text-center mt-4 max-w-xl text-base md:text-base text-muted-foreground leading-relaxed mb-16 md:mb-20">
          Cloud if you want simplicity. Self-host if you want control. No
          enterprise tier to hide things in. No surprise bills.
        </p>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span
            className={`text-sm transition-colors ${
              !yearly ? "text-foreground font-medium" : "text-muted-foreground"
            }`}
          >
            Monthly
          </span>
          <button
            onClick={() => setYearly(!yearly)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              yearly ? "bg-primary" : "bg-border"
            }`}
          >
            <span
              className={`inline-block size-5 rounded-full bg-white transition-transform ${
                yearly ? "translate-x-5.5" : "translate-x-0.5"
              }`}
            />
          </button>
          <span
            className={`text-sm transition-colors ${
              yearly ? "text-foreground font-medium" : "text-muted-foreground"
            }`}
          >
            Yearly <span className="text-primary text-xs">(save 17%)</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <PricingCard
            tier="Self-hosted"
            price="Free"
            period="open source"
            description="Run Lumen on your own infrastructure. Full control over data, retention, and access."
            cta="View on GitHub"
            ctaVariant="outline"
            features={[
              "Unlimited events",
              "Unlimited data retention",
              "Direct database access",
              "Docker or bare-metal deploy",
              "Community support",
              "MIT licensed",
            ]}
          />
          <PricingCard
            tier="Cloud"
            price={yearly ? "$120" : "$12"}
            period={yearly ? "per year" : "per month"}
            description="Managed hosting with automatic updates and SSL. No infrastructure to manage."
            cta="Get started"
            ctaVariant="primary"
            features={[
              yearly
                ? "1M events / month included"
                : "500k events / month included",
              "Unlimited custom events",
              "SQL query interface",
              yearly ? "1-year data retention" : "90-day data retention",
              "Team members included",
              "Free plan available — 50k events/mo",
            ]}
          />
        </div>
      </div>
    </section>
  );
}

interface PricingCardProps {
  tier: string;
  price: string;
  period: string;
  description: string;
  cta: string;
  ctaVariant: "primary" | "outline";
  features: string[];
}

function PricingCard({
  tier,
  price,
  period,
  description,
  cta,
  ctaVariant,
  features,
}: PricingCardProps) {
  return (
    <div className="relative rounded-2xl border border-border bg-card p-7 flex flex-col gap-7">
      {/* Header */}
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
          {tier}
        </p>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-4xl font-semibold text-foreground tracking-tight">
            {price}
          </span>
          <span className="text-sm text-muted-foreground">{period}</span>
        </div>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {/* CTA */}
      <Button
        className={
          ctaVariant === "primary"
            ? "bg-primary text-primary-foreground hover:bg-primary/90 h-10 text-sm font-medium rounded-md w-full"
            : "border-border text-foreground hover:bg-secondary h-10 text-sm font-medium rounded-md w-full"
        }
        variant={ctaVariant === "primary" ? "default" : "outline"}
      >
        {cta}
      </Button>

      {/* Features */}
      <div className="flex flex-col gap-2.5">
        {features.map((f) => (
          <div key={f} className="flex items-start gap-2.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            >
              <circle
                cx="7"
                cy="7"
                r="6.5"
                stroke="var(--primary)"
                strokeOpacity="0.5"
              />
              <polyline
                points="4,7 6.2,9.2 10,4.5"
                stroke="var(--primary)"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <span className="text-sm text-muted-foreground">{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
