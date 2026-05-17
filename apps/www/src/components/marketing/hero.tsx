import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="pt-32 pb-20 px-5 md:pt-40 md:pb-28">
      <div className="max-w-6xl mx-auto">
        <h1 className="mx-auto text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-[1.1] text-balance text-foreground mb-6 max-w-4xl text-center">
          Analytics That Answers Your Questions
        </h1>

        <p className="mx-auto text-center text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mb-10 text-pretty">
          Lumen is a privacy-first analytics platform for developers and product
          teams. Define your own events. Query your own way. Own your own data .
        </p>

        <div className="justify-center flex flex-col sm:flex-row items-center sm:items-center gap-3 mb-4">
          <Button
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-6 text-sm font-medium rounded-4xl w-full sm:w-auto"
          >
            Start for free
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-11 px-6 text-sm font-medium rounded-4xl border-border text-foreground hover:bg-secondary w-full sm:w-auto"
          >
            Self-host Lumen
          </Button>
        </div>

        <div className="mt-16 md:mt-20 relative">
          <div
            className="absolute -top-10 left-0 right-0 h-10 bg-linear-to-b from-background to-transparent pointer-events-none z-10"
            aria-hidden="true"
          />
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <DashboardPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Inline dashboard illustration — no external images, fully styled          */
/* -------------------------------------------------------------------------- */
function DashboardPreview() {
  return (
    <div className="bg-card text-card-foreground font-sans text-xs">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border">
        <span
          className="w-2.5 h-2.5 rounded-full bg-border"
          aria-hidden="true"
        />
        <span
          className="w-2.5 h-2.5 rounded-full bg-border"
          aria-hidden="true"
        />
        <span
          className="w-2.5 h-2.5 rounded-full bg-border"
          aria-hidden="true"
        />
        <span className="ml-4 text-muted-foreground text-xs">
          lumen.sh / acme-corp / overview
        </span>
      </div>

      <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricTile
          label="Unique visitors"
          value="48,291"
          delta="+12.4%"
          positive
        />
        <MetricTile label="Events today" value="1.2M" delta="+3.1%" positive />
        <MetricTile label="p95 latency" value="84 ms" delta="-6%" positive />

        <div className="md:col-span-3 rounded-lg border border-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Page views — last 14 days
              </p>
            </div>
            <span className="text-xs text-muted-foreground border border-border rounded px-2 py-0.5">
              14d
            </span>
          </div>
          <SparklineChart />
        </div>

        <div className="md:col-span-2 rounded-lg border border-border bg-secondary/30 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
            Top events
          </p>
          <div className="flex flex-col gap-2.5">
            {[
              { name: "page_view", count: "1,204,391", pct: 82 },
              { name: "cta_click", count: "48,231", pct: 33 },
              { name: "signup_start", count: "12,009", pct: 16 },
              { name: "signup_complete", count: "7,341", pct: 10 },
            ].map((ev) => (
              <EventRow key={ev.name} {...ev} />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-secondary/30 p-4 flex flex-col justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Data ownership
            </p>
            <p className="text-foreground text-sm font-medium leading-snug">
              Your database.
              <br />
              Your rules.
            </p>
          </div>
          <div className="space-y-1.5">
            <Trust label="No third-party cookies" />
            <Trust label="GDPR compliant by default" />
            <Trust label="Open source (MIT)" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  delta,
  positive,
}: {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
        {label}
      </p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p
        className={`text-xs mt-1 font-sans ${positive ? "text-primary" : "text-destructive"}`}
      >
        {delta} vs last period
      </p>
    </div>
  );
}

function SparklineChart() {
  const points = [40, 55, 48, 62, 58, 70, 65, 80, 72, 85, 78, 92, 88, 95];
  const max = Math.max(...points);
  const width = 100;
  const height = 40;
  const pts = points
    .map(
      (p, i) =>
        `${(i / (points.length - 1)) * width},${height - (p / max) * height}`,
    )
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-10 overflow-visible"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polyline
        points={`0,${height} ${pts} ${width},${height}`}
        fill="var(--primary)"
        fillOpacity="0.08"
        stroke="none"
      />
    </svg>
  );
}

function EventRow({
  name,
  count,
  pct,
}: {
  name: string;
  count: string;
  pct: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground w-28 shrink-0 truncate font-sans text-xs">
        {name}
      </span>
      <div className="flex-1 h-px bg-border relative">
        <span
          className="absolute left-0 top-0 h-px bg-primary"
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
      <span className="text-foreground text-xs w-20 text-right shrink-0">
        {count}
      </span>
    </div>
  );
}

function Trust({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="6" cy="6" r="5.5" stroke="var(--primary)" />
        <polyline
          points="3.5,6 5.2,7.8 8.5,4"
          stroke="var(--primary)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
