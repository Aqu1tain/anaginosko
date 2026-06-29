"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { fetchAdminStats, type AdminStats } from "../lib/api";

type Series = { day: string; views: number }[];
const defaultLoadSeries = (days: number): Promise<Series> =>
  fetchAdminStats(days).then((s) => s.viewsByDay);

// Jalons affichés sur le graphe de visites (lignes verticales repères).
const EVENTS = [
  { day: "2026-06-24", label: "Lancement" },
  { day: "2026-06-25", label: "1ᵉʳ TikTok (Biblion)" },
];

const isoToday = () => new Date().toISOString().slice(0, 10);
const isoShift = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// Étend la série à `days` jours pleins se terminant aujourd'hui : on remplit à 0
// les jours sans donnée (on voit la chronologie avant même d'avoir des visites).
function fillRange(series: Series, days: number): Series {
  const byDay = new Map(series.map((d) => [d.day, d.views]));
  const last = series.at(-1)?.day;
  const end = last && last > isoToday() ? last : isoToday();
  return Array.from({ length: days }, (_, k) => {
    const day = isoShift(end, k - days + 1);
    return { day, views: byDay.get(day) ?? 0 };
  });
}

// Recharts injecte active/payload/label dans le contenu cloné (props runtime,
// absentes du type public en v3) : on les déclare optionnelles localement.
type TipProps = {
  active?: boolean;
  label?: string | number;
  payload?: { value?: number | string }[];
  unit: string;
};

// Couleurs tirées des variables de thème DaisyUI : automatiquement justes en
// clair comme en sombre. (Recharts accepte var(--…) dans les fills SVG.)
const C = {
  primary: "var(--color-primary)",
  accent: "var(--color-accent)",
  grid: "var(--color-base-300)",
};

const dayLabel = (iso: string) => {
  const [, m, d] = iso.split("-");
  return d && m ? `${d}/${m}` : iso;
};

function ChartTooltip({ active, payload, label, unit }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-base-300 bg-base-100 px-2.5 py-1.5 text-xs shadow-lg">
      {label != null && <div className="font-medium">{label}</div>}
      <div className="text-base-content/70">
        <span className="font-semibold text-base-content">{payload[0].value}</span> {unit}
      </div>
    </div>
  );
}

// Carte de graphique réutilisable : titre + zone de contrôles + corps.
function ChartCard({
  title,
  subtitle,
  controls,
  children,
}: {
  title: string;
  subtitle?: string;
  controls?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-base-300 bg-base-100 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-base-content/70">{subtitle}</p>}
        </div>
        {controls}
      </div>
      {children}
    </section>
  );
}

function Seg({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`btn join-item btn-xs ${active ? "btn-primary" : "btn-ghost border border-base-300"}`}
    >
      {children}
    </button>
  );
}

const AXIS = { fontSize: 11, fill: "currentColor" } as const;

type ChartType = "area" | "bar" | "line";

function ViewsChart({
  data,
  type,
  events,
}: {
  data: Series;
  type: ChartType;
  events: { day: string; label: string }[];
}) {
  const tip = <Tooltip content={<ChartTooltip unit="visites" />} cursor={{ fill: "var(--color-base-200)" }} />;
  const common = {
    data,
    margin: { top: 4, right: 8, left: 0, bottom: 0 },
  };
  const x = (
    <XAxis
      dataKey="day"
      tickFormatter={dayLabel}
      tick={AXIS}
      tickLine={false}
      axisLine={false}
      minTickGap={20}
    />
  );
  const y = <YAxis tick={AXIS} tickLine={false} axisLine={false} width={40} allowDecimals={false} />;
  const grid = <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />;
  const marks = events.map((e) => (
    <ReferenceLine
      key={e.day}
      x={e.day}
      stroke={C.accent}
      strokeDasharray="4 3"
      strokeOpacity={0.8}
      ifOverflow="extendDomain"
    />
  ));

  return (
    <div className="h-60 text-base-content/55">
      <ResponsiveContainer width="100%" height="100%">
        {type === "bar" ? (
          <BarChart {...common}>
            {grid}
            {x}
            {y}
            {tip}
            <Bar dataKey="views" fill={C.primary} radius={[4, 4, 0, 0]} maxBarSize={42} />
            {marks}
          </BarChart>
        ) : type === "line" ? (
          <LineChart {...common}>
            {grid}
            {x}
            {y}
            {tip}
            <Line type="monotone" dataKey="views" stroke={C.primary} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            {marks}
          </LineChart>
        ) : (
          <AreaChart {...common}>
            <defs>
              <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.primary} stopOpacity={0.35} />
                <stop offset="100%" stopColor={C.primary} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            {grid}
            {x}
            {y}
            {tip}
            <Area type="monotone" dataKey="views" stroke={C.primary} strokeWidth={2.5} fill="url(#viewsFill)" />
            {marks}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function TopTextsChart({ data }: { data: { label: string; views: number }[] }) {
  return (
    <div className="text-base-content/55" style={{ height: Math.max(120, data.length * 34) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={C.grid} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <Tooltip content={<ChartTooltip unit="visites" />} cursor={{ fill: "var(--color-base-200)" }} />
          <Bar dataKey="views" fill={C.accent} radius={[0, 4, 4, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatCard({
  label,
  value,
  path,
  desc,
}: {
  label: string;
  value: number;
  path: string;
  desc?: React.ReactNode;
}) {
  return (
    <div className="stat px-4 py-3">
      <div className="stat-figure text-primary">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
          <path d={path} />
        </svg>
      </div>
      <div className="stat-title text-xs">{label}</div>
      <div className="stat-value text-3xl">{value.toLocaleString("fr-FR")}</div>
      {desc && <div className="stat-desc mt-0.5 text-xs">{desc}</div>}
    </div>
  );
}

const ICONS = {
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z M12 9.2a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6z",
  note: "M5 3.5h11l3 3V20.5H5z M14 3.5V7h3.5",
  users: "M9 11a3.2 3.2 0 100-6.4A3.2 3.2 0 009 11z M2.5 19.5a6.5 6.5 0 0113 0z M16 11a3 3 0 100-6 M21.5 19.5a6 6 0 00-5-5.9",
};

const PRESETS = [7, 14, 30, 90] as const;

export default function AdminAnalytics({
  stats,
  refLabel,
  loadSeries = defaultLoadSeries,
}: {
  stats: AdminStats;
  refLabel: (ref: string) => string;
  loadSeries?: (days: number) => Promise<Series>;
}) {
  const [type, setType] = useState<ChartType>("area");
  const [days, setDays] = useState(14);
  const [series, setSeries] = useState<Series>(stats.viewsByDay);
  const [loading, setLoading] = useState(false);

  // Le `stats` initial vaut déjà 14 j : on ne recharge la série qu'aux changements.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    let alive = true;
    setLoading(true);
    loadSeries(days)
      .then((s) => alive && setSeries(s))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [days, loadSeries]);

  const setDaysClamped = useCallback((n: number) => {
    if (Number.isFinite(n)) setDays(Math.min(365, Math.max(1, Math.trunc(n))));
  }, []);

  const trend = useMemo(() => {
    const d = stats.viewsByDay;
    if (d.length < 14) return null;
    const last = d.slice(-7).reduce((a, x) => a + x.views, 0);
    const prev = d.slice(-14, -7).reduce((a, x) => a + x.views, 0);
    if (!prev) return null;
    return Math.round(((last - prev) / prev) * 100);
  }, [stats.viewsByDay]);

  // Série complète sur la fenêtre demandée (0 avant les premières visites) +
  // jalons visibles dans cette fenêtre.
  const filled = useMemo(() => fillRange(series, days), [series, days]);
  const visibleEvents = useMemo(() => {
    const lo = filled[0]?.day ?? "";
    const hi = filled.at(-1)?.day ?? "";
    return EVENTS.filter((e) => e.day >= lo && e.day <= hi);
  }, [filled]);

  const topTexts = useMemo(
    () => stats.topRefs.map((r) => ({ label: refLabel(r.ref), views: r.views })),
    [stats.topRefs, refLabel],
  );

  const trendDesc =
    trend == null ? (
      "7 derniers jours"
    ) : (
      <span className={trend >= 0 ? "text-success" : "text-error"}>
        {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}% · 7 j
      </span>
    );

  return (
    <div className="mt-4 grid gap-4">
      <div className="stats stats-vertical w-full border border-base-300 bg-base-100 shadow-none sm:stats-horizontal">
        <StatCard label="Visites" value={stats.views} path={ICONS.eye} desc={trendDesc} />
        <StatCard label="Annotations" value={stats.annotations} path={ICONS.note} desc="au total" />
        <StatCard label="Comptes" value={stats.users} path={ICONS.users} desc="contributeurs" />
      </div>

      <ChartCard
        title="Visites"
        subtitle={`${days} dernier${days > 1 ? "s" : ""} jour${days > 1 ? "s" : ""}`}
        controls={
          <div className="flex flex-wrap items-center gap-2">
            <div className="join">
              <Seg active={type === "area"} onClick={() => setType("area")}>Aire</Seg>
              <Seg active={type === "bar"} onClick={() => setType("bar")}>Barres</Seg>
              <Seg active={type === "line"} onClick={() => setType("line")}>Ligne</Seg>
            </div>
            <div className="join">
              {PRESETS.map((p) => (
                <Seg key={p} active={days === p} onClick={() => setDays(p)}>
                  {p} j
                </Seg>
              ))}
            </div>
            <label className="flex items-center gap-1 text-xs text-base-content/60">
              <input
                type="number"
                min={1}
                max={365}
                value={days}
                onChange={(e) => setDaysClamped(Number(e.target.value))}
                className="input input-xs w-16 text-center tabular-nums"
                aria-label="Nombre de jours personnalisé"
              />
              j
            </label>
          </div>
        }
      >
        <div className="relative">
          {loading && (
            <span className="loading loading-spinner loading-sm absolute right-1 top-0 z-10 text-primary" />
          )}
          <ViewsChart data={filled} type={type} events={visibleEvents} />
        </div>
        {visibleEvents.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/60">
            {visibleEvents.map((e) => (
              <span key={e.day} className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 border-l-2 border-dashed border-accent" />
                {dayLabel(e.day)} — {e.label}
              </span>
            ))}
          </div>
        )}
      </ChartCard>

      {topTexts.length > 0 && (
        <ChartCard title="Textes les plus lus" subtitle={`${topTexts.length} en tête`}>
          <TopTextsChart data={topTexts} />
        </ChartCard>
      )}
    </div>
  );
}
