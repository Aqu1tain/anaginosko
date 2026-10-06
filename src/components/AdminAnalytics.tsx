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
import {
  fetchAdminStats,
  fetchMatomoAnalytics,
  type AdminStats,
  type MatomoAnalytics,
  type MatomoSummary,
  type NamedCount,
} from "../lib/api";

type Series = { day: string; views: number }[];
const defaultLoadSeries = (days: number): Promise<Series> =>
  fetchAdminStats(days).then((s) => s.viewsByDay);

// Date de bascule de la source de visites : page_views (maison) avant, Matomo
// après. Sert au raccord du graphe et au marqueur explicatif.
const MATOMO_SINCE = "2026-07-10";

// Jalons affichés sur le graphe de visites (lignes verticales repères).
const EVENTS = [
  { day: "2026-06-24", label: "Lancement" },
  { day: "2026-06-25", label: "1ᵉʳ TikTok (Biblion)" },
  { day: MATOMO_SINCE, label: "Bascule vers Matomo (source de données)" },
];

const HELP = {
  uniqueVisitors:
    "Personnes distinctes (un appareil, un navigateur) sur la période : un même visiteur revenant 3 fois compte 1.",
  visits:
    "Passages sur le site : une visite se termine après 30 min d'inactivité. Un visiteur revenant 3 fois compte 3 visites.",
  pageviews:
    "Nombre total de pages affichées, rechargements compris : une visite qui ouvre 5 pages en compte 5.",
  pagesPerVisit: "Pages vues divisées par le nombre de visites : la profondeur moyenne d'une visite.",
  avgTime:
    "Temps moyen passé sur le site par visite. Une visite d'une seule page compte souvent 0 s, faute de seconde mesure.",
  bounceRate:
    "Part des visites qui n'ont vu qu'une page avant de repartir. Plus il est bas, mieux c'est.",
  readings:
    "Chaque ouverture d'un texte dans le lecteur, comptée par le site lui-même depuis le lancement. Ce n'est ni un nombre de visites ni de visiteurs.",
};

const UNIQUE_MISSING =
  "Matomo ne calcule pas les visiteurs uniques sur une plage de dates tant que enable_processing_unique_visitors_range n'est pas activé dans sa configuration. La courbe quotidienne, elle, les donne jour par jour.";

const METRICS = {
  visits: { label: "Visites", unit: "visites" },
  uniqueVisitors: { label: "Visiteurs uniques", unit: "visiteurs uniques" },
  pageviews: { label: "Pages vues", unit: "pages vues" },
} as const;
type Metric = keyof typeof METRICS;

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

const NBSP = "\u00a0";
const fmt = (n: number, digits = 0) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: digits });
const plural = (n: number, word: string) => `${word}${n > 1 ? "s" : ""}`;

function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s}${NBSP}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}${NBSP}min ${String(s % 60).padStart(2, "0")}${NBSP}s`;
  return `${Math.floor(m / 60)}${NBSP}h ${String(m % 60).padStart(2, "0")}${NBSP}min`;
}

type Trend = { text: string; tone: "good" | "bad" | "flat" };

function toTrend(delta: number, unit: string, lowerIsBetter = false): Trend {
  if (delta === 0) return { text: "stable", tone: "flat" };
  const up = delta > 0;
  return {
    text: `${up ? "▲" : "▼"} ${fmt(Math.abs(delta))}${NBSP}${unit}`,
    tone: up !== lowerIsBetter ? "good" : "bad",
  };
}

function relativeTrend(current: number, previous: number | null | undefined): Trend | null {
  if (previous == null || previous === 0) return null;
  return toTrend(Math.round(((current - previous) / previous) * 100), "%");
}

const pagesPerVisit = (s: MatomoSummary) => (s.visits ? s.pageviews / s.visits : 0);

type Kpi = { label: string; value: string; help: string; trend: Trend | null; note?: string };

// Le taux de rebond se compare en points (45 % puis 50 % = +5 pts) et baisse
// quand c'est bon signe.
function buildKpis(s: MatomoSummary, p: MatomoSummary | null): Kpi[] {
  const unique = s.uniqueVisitors;
  return [
    {
      label: "Visiteurs uniques",
      value: unique == null ? "n/d" : fmt(unique),
      help: unique == null ? `${HELP.uniqueVisitors} ${UNIQUE_MISSING}` : HELP.uniqueVisitors,
      trend: unique == null ? null : relativeTrend(unique, p?.uniqueVisitors),
      note: unique == null ? "non calculé sur une période" : undefined,
    },
    { label: "Visites", value: fmt(s.visits), help: HELP.visits, trend: relativeTrend(s.visits, p?.visits) },
    {
      label: "Pages vues",
      value: fmt(s.pageviews),
      help: HELP.pageviews,
      trend: relativeTrend(s.pageviews, p?.pageviews),
    },
    {
      label: "Pages par visite",
      value: fmt(pagesPerVisit(s), 1),
      help: HELP.pagesPerVisit,
      trend: p ? relativeTrend(pagesPerVisit(s), pagesPerVisit(p)) : null,
    },
    {
      label: "Durée moyenne",
      value: formatDuration(s.avgTimeOnSite),
      help: HELP.avgTime,
      trend: relativeTrend(s.avgTimeOnSite, p?.avgTimeOnSite),
    },
    {
      label: "Taux de rebond",
      value: `${fmt(s.bounceRate)}${NBSP}%`,
      help: HELP.bounceRate,
      trend: p ? toTrend(Math.round(s.bounceRate - p.bounceRate), "pts", true) : null,
    },
  ];
}

// Recharts injecte active/payload/label dans le contenu cloné (props runtime,
// absentes du type public en v3) : on les déclare optionnelles localement.
type TipProps = {
  active?: boolean;
  label?: string | number;
  payload?: { value?: number | string }[];
  unit: string | ((label: string) => string);
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
  const text = typeof unit === "function" ? unit(String(label)) : unit;
  return (
    <div className="rounded-lg border border-base-300 bg-base-100 px-2.5 py-1.5 text-xs shadow-lg">
      {label != null && <div className="font-medium">{label}</div>}
      <div className="text-base-content/70">
        <span className="font-semibold text-base-content">{payload[0].value}</span> {text}
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

type Hover = { text: string; x: number; y: number } | null;

// Pastille « i » reliée au trait pointillé, rendue dans la marge haute du graphe.
function EventPin({
  vb,
  text,
  onEnter,
  onLeave,
}: {
  vb: { x: number; y: number };
  text: string;
  onEnter: (h: Hover) => void;
  onLeave: () => void;
}) {
  return (
    <g
      transform={`translate(${vb.x}, ${vb.y})`}
      onMouseEnter={() => onEnter({ text, x: vb.x, y: vb.y })}
      onMouseLeave={onLeave}
      style={{ cursor: "help" }}
    >
      <line x1={0} y1={0} x2={0} y2={-7} stroke={C.accent} strokeWidth={1.5} />
      <circle cx={0} cy={-15.5} r={8.5} fill="var(--color-base-100)" stroke={C.accent} strokeWidth={1.5} />
      <text
        x={0}
        y={-15.5}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Georgia, serif"
        fontSize={12}
        fontStyle="italic"
        fontWeight={700}
        fill={C.accent}
      >
        i
      </text>
      {/* zone de survol élargie */}
      <circle cx={0} cy={-15.5} r={13} fill="transparent" />
    </g>
  );
}

function ViewsChart({
  data,
  type,
  events,
  unit,
}: {
  data: Series;
  type: ChartType;
  events: { day: string; label: string }[];
  unit: (day: string) => string;
}) {
  const [hover, setHover] = useState<Hover>(null);
  const tip = <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: "var(--color-base-200)" }} />;
  const common = {
    data,
    margin: { top: 30, right: 8, left: 0, bottom: 0 },
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
      strokeOpacity={0.7}
      ifOverflow="extendDomain"
      label={(p: { viewBox: { x: number; y: number } }) => (
        <EventPin
          vb={p.viewBox}
          text={`${dayLabel(e.day)} · ${e.label}`}
          onEnter={setHover}
          onLeave={() => setHover(null)}
        />
      )}
    />
  ));

  return (
    <div className="relative h-60 text-base-content/55">
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
      {hover && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-lg border border-base-300 bg-base-100 px-2 py-1 text-xs font-medium text-base-content shadow-lg"
          style={{ left: hover.x, top: hover.y + 2 }}
        >
          {hover.text}
        </div>
      )}
    </div>
  );
}

// Barres horizontales classées (provenance, appareils, pays, textes…).
function RankBars({
  data,
  unit = "visites",
  color = C.accent,
  labelWidth = 120,
}: {
  data: NamedCount[];
  unit?: string;
  color?: string;
  labelWidth?: number;
}) {
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
            width={labelWidth}
          />
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: "var(--color-base-200)" }} />
          <Bar dataKey="visits" fill={color} radius={[0, 4, 4, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Liste des pages : les chemins sont longs, une liste lisible vaut mieux qu'un axe.
function PageList({ pages }: { pages: NonNullable<MatomoAnalytics["topPages"]> }) {
  const max = Math.max(1, ...pages.map((p) => p.pageviews));
  return (
    <ol className="grid gap-1">
      {pages.map((p, i) => (
        <li key={`${p.label}-${i}`} className="relative overflow-hidden rounded-md px-2 py-1.5 text-xs">
          <span
            className="absolute inset-y-0 left-0 rounded-md bg-primary/10"
            style={{ width: `${(p.pageviews / max) * 100}%` }}
            aria-hidden="true"
          />
          <span className="relative flex items-baseline justify-between gap-3">
            <a href={p.label} target="_blank" rel="noreferrer" title={p.label} className="link-hover truncate">
              {p.label}
            </a>
            <span className="shrink-0 tabular-nums text-base-content/70">
              <span className="font-semibold text-base-content">{fmt(p.pageviews)}</span>{" "}
              {plural(p.pageviews, "vue")} · {fmt(p.visits)} {plural(p.visits, "visite")}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function AiReferrals({
  data,
  visits,
}: {
  data: NonNullable<MatomoAnalytics["aiReferrals"]>;
  visits?: number;
}) {
  const share = visits ? (data.total / visits) * 100 : null;
  return (
    <>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-3xl font-semibold tabular-nums">{fmt(data.total)}</span>
        <span className="text-xs text-base-content/70">
          {plural(data.total, "visite")} sur la période
          {share != null && data.total > 0 && `, soit ${fmt(share, 1)}${NBSP}% des visites`}
        </span>
      </p>
      {data.sources.length > 0 ? (
        <div className="mt-3">
          <RankBars data={data.sources} color={C.primary} labelWidth={100} />
        </div>
      ) : (
        <p className="mt-2 text-sm text-base-content/70">
          Aucune visite venue d&apos;un assistant IA sur cette période. Quand ChatGPT, Perplexity,
          Claude, Gemini ou Le Chat citeront le site et enverront des visiteurs, ils apparaîtront ici.
        </p>
      )}
    </>
  );
}

// Requêtes de conteneur : 6 tuiles par ligne en pleine largeur, 3 puis 2 quand la place manque.
const KPI_GRID = "grid grid-cols-2 gap-3 @xl:grid-cols-3 @4xl:grid-cols-6";

const TONE = { good: "text-success", bad: "text-error", flat: "text-base-content/60" } as const;

function KpiTile({ kpi, compare }: { kpi: Kpi; compare: string }) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 px-3 py-3" title={kpi.help}>
      <div className="flex items-center gap-1 text-xs text-base-content/70">
        {kpi.label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="opacity-60">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5 M12 7.5v.01" strokeLinecap="round" />
        </svg>
      </div>
      <div className="mt-1 whitespace-nowrap text-xl font-semibold leading-tight tabular-nums @xl:text-2xl @4xl:text-xl">{kpi.value}</div>
      <div className="mt-0.5 text-xs">
        {kpi.trend ? (
          <>
            <span className={`font-medium ${TONE[kpi.trend.tone]}`}>{kpi.trend.text}</span>{" "}
            <span className="text-base-content/50">{compare}</span>
          </>
        ) : (
          <span className="text-base-content/50">{kpi.note ?? "pas de comparaison"}</span>
        )}
      </div>
    </div>
  );
}

function Glossary({ kpis }: { kpis: Kpi[] }) {
  const entries = [...kpis.map((k) => ({ label: k.label, help: k.help })), { label: "Lectures de textes", help: HELP.readings }];
  return (
    <details className="rounded-xl bg-base-200/60 px-3 py-2 text-xs">
      <summary className="cursor-pointer select-none font-medium text-base-content/70">
        Que signifient ces chiffres ?
      </summary>
      <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {entries.map((e) => (
          <div key={e.label}>
            <dt className="font-medium">{e.label}</dt>
            <dd className="text-base-content/70">{e.help}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function InternalStat({ label, value, desc, help }: { label: string; value: number; desc: string; help?: string }) {
  return (
    <div className="px-4 py-2.5" title={help}>
      <div className="text-xs text-base-content/70">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{fmt(value)}</div>
      <div className="text-xs text-base-content/50">{desc}</div>
    </div>
  );
}

function MatomoNotice({ state }: { state: "off" | "error" }) {
  return (
    <p className="rounded-xl border border-base-300 px-3 py-2 text-xs text-base-content/70">
      {state === "off"
        ? "Matomo n'est pas branché : seules les données internes du site sont affichées."
        : "Matomo est injoignable pour le moment : seules les données internes du site sont affichées."}
    </p>
  );
}

function chartSubtitle(metric: Metric, matomoOn: boolean, windowText: string, from: string): string {
  if (!matomoOn) return `${windowText} · ouvertures de textes comptées par le site`;
  if (metric === "uniqueVisitors")
    return `${windowText} · par jour : un visiteur revenu deux jours différents compte chaque jour`;
  if (metric === "pageviews") return `${windowText} · toutes les pages affichées, par jour`;
  if (from < MATOMO_SINCE)
    return `${windowText} · lectures internes avant le ${dayLabel(MATOMO_SINCE)}, visites Matomo après`;
  return `${windowText} · visites par jour`;
}

const PRESETS = [7, 14, 30, 90] as const;

type LoadState = "loading" | "ready" | "error";

export default function AdminAnalytics({
  stats,
  refLabel,
  loadSeries = defaultLoadSeries,
  loadAnalytics = fetchMatomoAnalytics,
}: {
  stats: AdminStats;
  refLabel: (ref: string) => string;
  loadSeries?: (days: number) => Promise<Series>;
  loadAnalytics?: (days: number) => Promise<MatomoAnalytics>;
}) {
  const [type, setType] = useState<ChartType>("area");
  const [metric, setMetric] = useState<Metric>("visits");
  const [days, setDays] = useState(14);
  const [series, setSeries] = useState<Series>(stats.viewsByDay);
  const [analytics, setAnalytics] = useState<MatomoAnalytics | null>(null);
  const [analyticsState, setAnalyticsState] = useState<LoadState>("loading");
  const [loading, setLoading] = useState(false);

  // Matomo n'est pas dans le `stats` initial : on le charge au montage puis à
  // chaque changement de fenêtre. Échec ou non configuré → dégradation propre.
  useEffect(() => {
    let alive = true;
    setAnalyticsState("loading");
    loadAnalytics(days)
      .then((a) => {
        if (!alive) return;
        setAnalytics(a);
        setAnalyticsState("ready");
      })
      .catch(() => {
        if (!alive) return;
        setAnalytics(null);
        setAnalyticsState("error");
      });
    return () => {
      alive = false;
    };
  }, [days, loadAnalytics]);

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

  const matomoOn = analytics?.configured ?? false;
  // Une API antérieure ne renvoie ni résumé ni détail quotidien : on s'en tient aux visites.
  const extended = matomoOn && Boolean(analytics?.summary);
  const activeMetric: Metric = extended ? metric : "visits";

  // Série complète sur la fenêtre demandée (0 avant les premières visites).
  const filled = useMemo(() => fillRange(series, days), [series, days]);

  // Raccord des sources pour les visites : page_views avant la bascule, Matomo
  // après. Visiteurs uniques et pages vues n'existent que dans Matomo.
  const chartData = useMemo(() => {
    if (!matomoOn || !analytics) return filled;
    if (activeMetric === "visits") {
      const mv = new Map(analytics.visitsByDay.map((d) => [d.day, d.visits]));
      return filled.map((d) => (d.day >= MATOMO_SINCE ? { day: d.day, views: mv.get(d.day) ?? 0 } : d));
    }
    const daily = analytics.visitsByDay.map((d) => ({ day: d.day, views: d[activeMetric] ?? 0 }));
    return fillRange(daily, days);
  }, [filled, analytics, matomoOn, activeMetric, days]);

  // Jalons visibles dans la fenêtre (le marqueur de bascule seulement si Matomo).
  const visibleEvents = useMemo(() => {
    const lo = filled[0]?.day ?? "";
    const hi = filled.at(-1)?.day ?? "";
    return EVENTS.filter(
      (e) => e.day >= lo && e.day <= hi && (e.day !== MATOMO_SINCE || matomoOn),
    );
  }, [filled, matomoOn]);

  const unitFor = useCallback(
    (day: string) =>
      !matomoOn || day < MATOMO_SINCE ? "lectures (compteur interne)" : METRICS[activeMetric].unit,
    [matomoOn, activeMetric],
  );

  const topTexts = useMemo(
    () => stats.topRefs.map((r) => ({ label: refLabel(r.ref), visits: r.views })),
    [stats.topRefs, refLabel],
  );

  const summary = extended ? analytics?.summary : undefined;
  const previous = analytics?.previous?.visits ? analytics.previous : null;
  const kpis = summary ? buildKpis(summary, previous) : null;
  const compare = `vs ${days}${NBSP}j préc.`;
  const windowText = `${days} dernier${days > 1 ? "s" : ""} jour${days > 1 ? "s" : ""}`;

  return (
    <div className="@container mt-4 grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Audience</h2>
          <p className="mt-0.5 text-xs text-base-content/70">
            {matomoOn
              ? `${windowText}, comparés aux ${days} jours précédents · source Matomo`
              : windowText}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(loading || analyticsState === "loading") && (
            <span className="loading loading-spinner loading-xs text-primary" aria-label="Chargement" />
          )}
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
      </div>

      {kpis ? (
        <>
          <div className={KPI_GRID}>
            {kpis.map((k) => (
              <KpiTile key={k.label} kpi={k} compare={compare} />
            ))}
          </div>
          <Glossary kpis={kpis} />
        </>
      ) : analyticsState === "loading" && !analytics ? (
        <div className={KPI_GRID}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-[5.5rem] rounded-2xl" />
          ))}
        </div>
      ) : analyticsState === "error" ? (
        <MatomoNotice state="error" />
      ) : !matomoOn ? (
        <MatomoNotice state="off" />
      ) : null}

      <section className="rounded-2xl border border-dashed border-base-300">
        <h3 className="px-4 pt-2.5 text-xs font-medium text-base-content/60">
          Compteurs internes du site, depuis le lancement
        </h3>
        <div className="grid grid-cols-1 divide-base-300 sm:grid-cols-3 sm:divide-x">
          <InternalStat
            label="Lectures de textes"
            value={stats.views}
            desc="ouvertures d'un texte dans le lecteur"
            help={HELP.readings}
          />
          <InternalStat label="Annotations" value={stats.annotations} desc="au total" />
          <InternalStat label="Comptes" value={stats.users} desc="contributeurs" />
        </div>
      </section>

      <ChartCard
        title={matomoOn ? METRICS[activeMetric].label : "Lectures de textes"}
        subtitle={chartSubtitle(activeMetric, matomoOn, windowText, filled[0]?.day ?? "")}
        controls={
          <div className="flex flex-wrap items-center gap-2">
            {extended && (
              <div className="join">
                {(Object.keys(METRICS) as Metric[]).map((m) => (
                  <Seg key={m} active={activeMetric === m} onClick={() => setMetric(m)}>
                    {METRICS[m].label}
                  </Seg>
                ))}
              </div>
            )}
            <div className="join">
              <Seg active={type === "area"} onClick={() => setType("area")}>Aire</Seg>
              <Seg active={type === "bar"} onClick={() => setType("bar")}>Barres</Seg>
              <Seg active={type === "line"} onClick={() => setType("line")}>Ligne</Seg>
            </div>
          </div>
        }
      >
        <ViewsChart data={chartData} type={type} events={visibleEvents} unit={unitFor} />
      </ChartCard>

      {matomoOn && analytics && (
        <div className="grid gap-4 lg:grid-cols-2">
          {analytics.topPages && analytics.topPages.length > 0 && (
            <ChartCard title="Pages les plus vues" subtitle="pages vues, et nombre de visites qui les ont ouvertes">
              <PageList pages={analytics.topPages} />
            </ChartCard>
          )}
          {analytics.aiReferrals && (
            <ChartCard title="Venues depuis les assistants IA" subtitle="ChatGPT, Perplexity, Claude, Gemini…">
              <AiReferrals data={analytics.aiReferrals} visits={summary?.visits} />
            </ChartCard>
          )}
          {analytics.referrerTypes.length > 0 && (
            <ChartCard title="Provenance" subtitle="d'où viennent les visites">
              <RankBars data={analytics.referrerTypes} labelWidth={140} />
            </ChartCard>
          )}
          {analytics.topReferrers.length > 0 && (
            <ChartCard title="Sites référents" subtitle="principales sources externes">
              <RankBars data={analytics.topReferrers} color={C.primary} labelWidth={140} />
            </ChartCard>
          )}
          {analytics.devices.length > 0 && (
            <ChartCard title="Appareils" subtitle="type d'appareil">
              <RankBars data={analytics.devices} color={C.primary} labelWidth={90} />
            </ChartCard>
          )}
          {analytics.countries.length > 0 && (
            <ChartCard title="Pays" subtitle="top pays visiteurs">
              <RankBars data={analytics.countries} labelWidth={110} />
            </ChartCard>
          )}
        </div>
      )}

      {topTexts.length > 0 && (
        <ChartCard
          title="Textes les plus lus"
          subtitle={`${topTexts.length} en tête · compteur interne, depuis le lancement`}
        >
          <RankBars data={topTexts} unit="lectures" />
        </ChartCard>
      )}
    </div>
  );
}
