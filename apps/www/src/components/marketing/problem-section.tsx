export function ProblemSection() {
  return (
    <section className="py-20 md:py-32 px-5 border-t border-border">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 md:mb-20 max-w-3xl mx-auto">
          <span className="justify-center w-full mb-5 inline-flex items-center text-xs uppercase tracking-widest text-muted-foreground">
            The problem
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl text-center font-semibold tracking-tight leading-snug text-foreground text-balance">
            Most analytics tools answer the wrong questions
          </h2>
        </div>

        <div className="flex flex-col gap-10 md:gap-16">
          <PainPoint
            graphic={<ScatteredGrid />}
            title="Dashboards can't answer your real questions"
            text="You set up Google Analytics, spend an afternoon configuring events, and then open the dashboard only to realize it can't tell you what your most engaged users actually do before they convert."
          />
          <PainPoint
            graphic={<BuriedSignal />}
            title="Built for ads, not product understanding"
            text="Meanwhile you're adding consent banners, managing cookie compliance across jurisdictions, and paying for a tool that was designed for ad attribution — not product understanding."
          />
          <PainPoint
            graphic={<WalledData />}
            title="Your data is locked away"
            text="The data exists somewhere in their warehouse. Getting to it means learning their proprietary query language, upgrading your plan, or waiting for a report that doesn't quite match what you needed."
          />
        </div>
        <p className="mt-16 md:mt-20 text-foreground font-medium text-base md:text-base leading-relaxed max-w-2xl text-center mx-auto">
          Lumen exists because of this frustration. Not as a protest, but as a
          better answer.
        </p>
      </div>
    </section>
  );
}

function PainPoint({
  graphic,
  title,
  text,
}: {
  graphic: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex flex-col md:flex-row items-start gap-5 md:gap-10 mx-auto">
      <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl border border-border bg-card md:size-28">
        {graphic}
      </div>
      <div>
        <h3 className="mb-1.5 text-base md:text-lg font-semibold text-foreground">
          {title}
        </h3>
        <p className="max-w-xl text-base md:text-base leading-relaxed text-muted-foreground">
          {text}
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Custom inline SVGs — abstract data-viz glyphs                             */
/* -------------------------------------------------------------------------- */

function ScatteredGrid() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="size-10 md:size-14"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="2"
        width="13"
        height="13"
        rx="2.5"
        opacity="0.15"
        fill="var(--foreground)"
      />
      <rect
        x="19"
        y="2"
        width="13"
        height="13"
        rx="2.5"
        fill="var(--primary)"
      />
      <rect
        x="36"
        y="2"
        width="13"
        height="13"
        rx="2.5"
        opacity="0.15"
        fill="var(--foreground)"
      />
      <rect
        x="2"
        y="19"
        width="13"
        height="13"
        rx="2.5"
        opacity="0.15"
        fill="var(--foreground)"
      />
      <rect
        x="36"
        y="19"
        width="13"
        height="13"
        rx="2.5"
        opacity="0.15"
        fill="var(--foreground)"
      />
      <rect
        x="53"
        y="19"
        width="13"
        height="13"
        rx="2.5"
        fill="var(--primary)"
        opacity="0.4"
      />
      <rect
        x="2"
        y="36"
        width="13"
        height="13"
        rx="2.5"
        opacity="0.15"
        fill="var(--foreground)"
      />
      <rect
        x="19"
        y="36"
        width="13"
        height="13"
        rx="2.5"
        opacity="0.15"
        fill="var(--foreground)"
      />
      <rect
        x="36"
        y="36"
        width="13"
        height="13"
        rx="2.5"
        opacity="0.15"
        fill="var(--foreground)"
      />
      <rect
        x="53"
        y="36"
        width="13"
        height="13"
        rx="2.5"
        fill="var(--primary)"
      />
    </svg>
  );
}

function BuriedSignal() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="size-10 md:size-14"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="4"
        width="56"
        height="6"
        rx="3"
        opacity="0.12"
        fill="var(--foreground)"
      />
      <rect
        x="12"
        y="15"
        width="48"
        height="6"
        rx="3"
        opacity="0.12"
        fill="var(--foreground)"
      />
      <rect
        x="4"
        y="26"
        width="56"
        height="6"
        rx="3"
        opacity="0.12"
        fill="var(--foreground)"
      />
      <rect
        x="22"
        y="37"
        width="32"
        height="6"
        rx="3"
        opacity="0.12"
        fill="var(--foreground)"
      />
      <rect x="4" y="48" width="30" height="10" rx="3" fill="var(--primary)" />
    </svg>
  );
}

function WalledData() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="size-10 md:size-14"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="10" r="3.5" opacity="0.15" fill="var(--foreground)" />
      <circle cx="22" cy="22" r="3.5" opacity="0.15" fill="var(--foreground)" />
      <circle cx="8" cy="34" r="3.5" opacity="0.15" fill="var(--foreground)" />
      <circle cx="22" cy="46" r="3.5" opacity="0.15" fill="var(--foreground)" />
      <circle cx="8" cy="54" r="3.5" opacity="0.15" fill="var(--foreground)" />
      <line
        x1="32"
        y1="0"
        x2="32"
        y2="64"
        stroke="var(--border)"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
      <circle cx="44" cy="10" r="3.5" fill="var(--primary)" opacity="0.4" />
      <circle cx="56" cy="22" r="3.5" fill="var(--primary)" />
      <circle cx="44" cy="34" r="3.5" fill="var(--primary)" opacity="0.4" />
      <circle cx="56" cy="46" r="3.5" fill="var(--primary)" />
      <circle cx="44" cy="54" r="3.5" fill="var(--primary)" />
    </svg>
  );
}
