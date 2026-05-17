"use client";

import { useState } from "react";

export function ProductSection() {
  return (
    <section
      id="product"
      className="py-20 md:py-32 px-5 border-t border-border"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 md:mb-20 max-w-3xl mx-auto text-center">
          <span className="mb-5 inline-flex items-center rounded-full px-3 py-1 text-xs font-mono uppercase tracking-widest text-muted-foreground">
            The product
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-normal text-foreground text-balance">
            A Dashboard Worth Opening
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-base md:text-base text-muted-foreground leading-relaxed">
            Clean hierarchy. Instant context. Every number has a reason to be
            there. Lumen gives you one view of your product without the noise.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="md:col-span-2 rounded-2xl border border-border overflow-hidden">
            <DashboardBeauty />
          </div>

          <div className="flex flex-col gap-4 md:gap-6">
            <FeatureCard
              glyph={<PrivacyGlyph />}
              title="Privacy-first by default"
              text="No cookie banners. No third-party trackers. Your data stays yours — always."
            />
            <FeatureCard
              glyph={<EventsGlyph />}
              title="Define your own events"
              text="Track what matters. Name it, tag it, query it. No vendor lock-in on your metrics."
            />
            <FeatureCard
              glyph={<SelfHostGlyph />}
              title="Yours to own"
              text="One script tag. Your database. Your rules. Self-host or use our cloud — you choose."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  glyph,
  title,
  text,
}: {
  glyph: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 md:p-6 h-full">
      <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-muted md:size-12">
        {glyph}
      </div>
      <h3 className="mb-1 text-sm md:text-base font-semibold text-foreground">
        {title}
      </h3>
      <p className="text-xs md:text-sm leading-relaxed text-muted-foreground">
        {text}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Interactive dashboard mockup — tab switcher between product views         */
/* -------------------------------------------------------------------------- */

const VIEWS = ["Dashboard", "Events", "Queries"] as const;
type View = (typeof VIEWS)[number];

const INITIAL_EVENTS = [
  {
    name: "page_view",
    description: "Fired on every page load",
    disabled: false,
  },
  {
    name: "cta_click",
    description: "Any primary CTA button click",
    disabled: false,
  },
  {
    name: "signup_start",
    description: "User begins registration",
    disabled: false,
  },
  {
    name: "signup_complete",
    description: "Registration submitted",
    disabled: false,
  },
  { name: "old_metric_v3", description: "Deprecated event", disabled: true },
];

function DashboardBeauty() {
  const [activeView, setActiveView] = useState<View>("Dashboard");
  const [events, setEvents] = useState(INITIAL_EVENTS);

  const toggleEvent = (name: string) => {
    setEvents((current) =>
      current.map((ev) =>
        ev.name === name ? { ...ev, disabled: !ev.disabled } : ev,
      ),
    );
  };

  const isTracking = events.some((ev) => !ev.disabled);

  return (
    <div className="bg-background">
      <div className="flex items-center gap-1.5 border-b border-border px-5 py-3.5">
        <div className="size-2.5 rounded-full bg-foreground/50 dark:bg-muted" />
        <div className="size-2.5 rounded-full bg-foreground/50 dark:bg-muted" />
        <div className="size-2.5 rounded-full bg-foreground/50 dark:bg-muted" />
        <span className="ml-3 font-mono text-xs text-muted-foreground">
          lumen.sh / {activeView.toLowerCase()}
        </span>
      </div>

      <div className="flex gap-0 border-b border-border px-5">
        {VIEWS.map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`px-3 py-2.5 text-xs font-medium transition-colors ${
              activeView === view
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground/60 hover:text-muted-foreground"
            }`}
          >
            {view}
          </button>
        ))}
      </div>

      <div className="p-5 md:p-6">
        {activeView === "Dashboard" && (
          <DashboardView isTracking={isTracking} />
        )}
        {activeView === "Events" && (
          <EventsView events={events} onToggle={toggleEvent} />
        )}
        {activeView === "Queries" && <QueriesView />}
      </div>
    </div>
  );
}

/* ---------------------------------- Dashboard tab ------------------------- */

function DashboardView({ isTracking }: { isTracking: boolean }) {
  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-white">Overview</p>
      <p className="mb-6 text-xs text-neutral-500">
        {isTracking
          ? "Real-time data from your active events."
          : "Add your first event to start tracking."}
      </p>

      <div className="mb-4 grid grid-cols-2 gap-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl bg-neutral-100 dark:border dark:border-neutral-800  dark:bg-neutral-900/50 p-3 transition-colors hover:border-primary/50 md:p-4"
          >
            <p className="mb-2 text-xs uppercase tracking-wider text-neutral-600">
              {m.label}
            </p>
            {isTracking ? (
              <>
                <p className="text-2xl font-semibold dark:text-white">
                  {m.value}
                </p>
                <p className="mt-1 text-xs text-emerald-400">{m.change}</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-semibold text-neutral-700">—</p>
                <p className="mt-1 h-3 w-16 rounded bg-neutral-800/50" />
              </>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-neutral-100 dark:border dark:border-neutral-800 dark:bg-neutral-900/50 p-4">
        <p className="mb-4 text-xs uppercase tracking-wider text-neutral-600">
          Page views — last 14 days
        </p>
        {isTracking ? (
          <div className="flex h-20 items-end gap-1">
            {chartBars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-primary/60 dark:bg-primary/30 transition-all hover:bg-primary/50"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-20 items-center justify-center">
            <p className="text-xs text-neutral-700">
              No data yet. Add your script to start collecting.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const metrics = [
  { label: "Visitors", value: "1,482", change: "+12.3%" },
  { label: "Page views", value: "6,021", change: "+8.1%" },
  { label: "Events", value: "12.4k", change: "+23.7%" },
  { label: "Conversion", value: "3.2%", change: "+0.8%" },
];

const chartBars = [30, 45, 38, 52, 48, 62, 55, 70, 65, 78, 72, 85, 80, 90];

/* ---------------------------------- Events tab ---------------------------- */

function EventsView({
  events,
  onToggle,
}: {
  events: typeof INITIAL_EVENTS;
  onToggle: (name: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-white">Custom events</p>
      <p className="mb-6 text-xs text-neutral-500">
        Define the actions that matter to your product.
      </p>

      <div className="flex flex-col gap-2">
        {events.map((ev) => (
          <label
            key={ev.name}
            className="flex cursor-pointer items-center gap-3 rounded-xl border dark:border-neutral-800 dark:bg-neutral-900/50 px-4 py-3 transition-colors hover:border-neutral-700"
          >
            <input
              type="checkbox"
              checked={!ev.disabled}
              onChange={() => onToggle(ev.name)}
              className="size-4 accent-primary"
            />
            <div className="flex-1">
              <p className="text-xs font-medium text-foreground dark:text-white">
                {ev.name}
              </p>
              <p className="text-xs text-neutral-500">{ev.description}</p>
            </div>
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-mono uppercase tracking-wider ${
                ev.disabled
                  ? "dark:bg-neutral-800  bg-neutral-100 text-neutral-600"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {ev.disabled ? "inactive" : "tracking"}
            </span>
          </label>
        ))}
      </div>

      <button className="mt-4 flex items-center gap-1.5 rounded-xl border border-dashed border-neutral-700 px-4 py-3 text-xs text-neutral-500 transition-colors hover:border-neutral-600 hover:text-neutral-400">
        <span className="text-base leading-none">+</span>
        Add custom event
      </button>
    </div>
  );
}

/* ---------------------------------- Queries tab --------------------------- */

function QueriesView() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ time: string } | null>(null);

  const handleRun = () => {
    if (running) return;
    setRunning(true);
    setResult(null);
    setTimeout(
      () => {
        setRunning(false);
        setResult({ time: (0.015 + Math.random() * 0.04).toFixed(3) });
      },
      600 + Math.random() * 400,
    );
  };

  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-white">SQL query editor</p>
      <p className="mb-6 text-xs text-neutral-500">
        Ask any question about your data. Plain SQL, always.
      </p>

      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/80 px-4 py-2">
          <span className="text-xs font-mono text-neutral-600">query.sql</span>
          <button
            onClick={handleRun}
            disabled={running}
            className="cursor-pointer rounded bg-primary/10 px-2 py-0.5 text-xs font-mono text-primary transition-colors hover:bg-primary/20 disabled:cursor-wait disabled:opacity-50"
          >
            {running ? "running…" : "run"}
          </button>
        </div>

        <pre className="overflow-x-auto bg-neutral-950 p-4 font-mono text-xs leading-6">
          <code>
            <span className="text-neutral-600">
              -- Which events lead to signup in under 10 minutes?
            </span>
            {"\n"}
            <span className="text-primary">SELECT </span>
            <span className="text-white">e.name, COUNT(*) as conversions</span>
            {"\n"}
            <span className="text-primary">FROM </span>
            <span className="text-white">events e</span>
            {"\n"}
            <span className="text-primary">JOIN </span>
            <span className="text-white">
              events signup ON signup.session_id = e.session_id
            </span>
            {"\n"}
            <span className="text-primary">WHERE </span>
            <span className="text-white">
              signup.name = &apos;signup_complete&apos;
            </span>
            {"\n"}
            <span className="text-white">
              {"  AND signup.timestamp - e.timestamp < interval "}
            </span>
            <span className="text-primary">&apos;10 minutes&apos;</span>
            {"\n"}
            <span className="text-primary">GROUP BY </span>
            <span className="text-white">e.name</span>
            {"\n"}
            <span className="text-primary">ORDER BY </span>
            <span className="text-white">conversions DESC;</span>
          </code>
        </pre>

        <div className="border-t border-neutral-800 bg-neutral-900/50 p-4">
          {running ? (
            <p className="mb-3 animate-pulse text-xs font-mono text-neutral-600">
              -- running query…
            </p>
          ) : result ? (
            <p className="mb-3 text-xs font-mono text-emerald-400">
              -- 4 rows returned in {result.time}s
            </p>
          ) : (
            <p className="mb-3 text-xs font-mono text-neutral-600">
              -- 4 rows returned in 0.023s
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {["page_view", "cta_click", "signup_start"].map((name) => (
              <div
                key={name}
                className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-3"
              >
                <p className="mb-1 font-mono text-xs text-neutral-400">
                  {name}
                </p>
                <p className="font-semibold text-white">
                  {name === "page_view"
                    ? "1,204"
                    : name === "cta_click"
                      ? "342"
                      : "89"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Feature glyphs — abstract SVGs in primary color                           */
/* -------------------------------------------------------------------------- */

function PrivacyGlyph() {
  return (
    <svg
      viewBox="0 0 28 28"
      className="size-5 md:size-6"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="10"
        width="20"
        height="15"
        rx="3"
        stroke="var(--primary)"
        strokeWidth="1.5"
      />
      <path
        d="M14 15v4"
        stroke="var(--primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="14" cy="23" r="1" fill="var(--primary)" />
      <path
        d="M9 10V7a5 5 0 0 1 10 0v3"
        stroke="var(--primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EventsGlyph() {
  return (
    <svg
      viewBox="0 0 28 28"
      className="size-5 md:size-6"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="22"
        height="18"
        rx="3"
        stroke="var(--primary)"
        strokeWidth="1.5"
      />
      <path
        d="M9 12h10"
        stroke="var(--primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M9 17h6"
        stroke="var(--primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M3 9h22" stroke="var(--primary)" strokeWidth="1.5" />
      <circle cx="6.5" cy="7" r="1" fill="var(--primary)" />
    </svg>
  );
}

function SelfHostGlyph() {
  return (
    <svg
      viewBox="0 0 28 28"
      className="size-5 md:size-6"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="4"
        width="22"
        height="20"
        rx="3"
        stroke="var(--primary)"
        strokeWidth="1.5"
      />
      <path d="M3 11h22" stroke="var(--primary)" strokeWidth="1.5" />
      <circle cx="7" cy="8" r="1" fill="var(--primary)" />
      <circle cx="10" cy="8" r="1" fill="var(--primary)" />
      <circle cx="13" cy="8" r="1" fill="var(--primary)" />
      <rect
        x="7"
        y="15"
        width="6"
        height="6"
        rx="1"
        fill="var(--primary)"
        opacity="0.3"
      />
      <rect
        x="16"
        y="15"
        width="6"
        height="3"
        rx="1"
        fill="var(--primary)"
        opacity="0.3"
      />
    </svg>
  );
}
