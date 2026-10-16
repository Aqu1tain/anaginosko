"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/src/hooks/useAuth";
import { apiFetch, getToken } from "@/src/lib/api";
import { loadBooks, type NtBook } from "@/src/data/nt";
import { corpusById } from "@/src/data/corpus";
import { fetchVerseCounts, fetchWorkshopStats, type QueueItem, type VerseCounts, type WorkCorpus, type WorkshopStats } from "@/src/lib/workshopApi";

type PublishedMap = Record<string, Record<string, unknown>>;
const pct = (n: number, total: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);

function Queue({ title, items, corpus, tone }: { title: string; items: QueueItem[]; corpus: WorkCorpus; tone: string }) {
  if (!items.length) return null;
  const names = corpusById(corpus).bookNames;
  return (
    <section className="rounded-box border border-base-300 p-4">
      <h3 className="flex items-baseline justify-between text-sm font-semibold">
        {title}
        <span className={`rounded-full px-2 text-xs tabular-nums ${tone}`}>{items.length}</span>
      </h3>
      <ul className="mt-2 space-y-1 text-sm">
        {items.slice(0, 8).map((q) => {
          const [ch, v] = q.ref.split(":");
          return (
            <li key={`${q.book}${q.ref}`}>
              <Link href={`?corpus=${corpus}&book=${q.book}&ch=${ch}#v${v}`} className="flex items-baseline justify-between gap-2 hover:text-primary">
                <span>
                  {names[q.book] ?? q.book} {q.ref}
                </span>
                <span className="truncate text-xs text-base-content/45">{q.note ?? q.author}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ImportLxx({ published }: { published: number }) {
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const headers = (): HeadersInit => {
    const t = getToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  };
  useEffect(() => {
    fetch("/admin/arbitrage/api/workshop/import-lxx", { headers: headers() })
      .then((r) => r.json())
      .then((d) => setCount(d.count ?? 0))
      .catch(() => setCount(0));
  }, []);
  if (!count || published >= count) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-box border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
      <span>{done ?? `${count} traductions maison de l’ancien atelier ne sont pas encore dans l’atelier.`}</span>
      {!done && (
        <button
          type="button"
          disabled={busy}
          className="btn btn-sm"
          onClick={async () => {
            setBusy(true);
            const r = await fetch("/admin/arbitrage/api/workshop/import-lxx", { method: "POST", headers: headers() });
            const d = await r.json().catch(() => null);
            setDone(r.ok ? `${d.imported} versets repris.` : (d?.error ?? "Échec de la reprise."));
            setBusy(false);
          }}
        >
          {busy ? "Reprise…" : "Reprendre"}
        </button>
      )}
    </div>
  );
}

// Pilotage : couverture, file de travail, rythme et traducteurs d'un corpus.
export default function WorkshopHome({ corpus }: { corpus: WorkCorpus }) {
  const config = corpusById(corpus);
  const { user } = useAuth();
  const [stats, setStats] = useState<WorkshopStats | null>(null);
  const [verses, setVerses] = useState<VerseCounts | null>(null);
  const [books, setBooks] = useState<NtBook[]>([]);
  const [published, setPublished] = useState<PublishedMap>({});
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setStats(null);
    setVerses(null);
    fetchWorkshopStats(corpus).then(setStats).catch((e) => setError(e.message));
    fetchVerseCounts(corpus).then(setVerses).catch(() => {});
    loadBooks(config).then(setBooks).catch(() => {});
    apiFetch<{ translations: PublishedMap }>(`/translations?corpus=${corpus}`)
      .then((d) => setPublished(d.translations))
      .catch(() => {});
  }, [corpus, config]);

  if (error) return <p className="py-12 text-center text-base-content/60">{error}</p>;
  if (!stats) return <p className="py-12 text-center text-base-content/50">Chargement…</p>;

  const totalVerses = verses ? Object.values(verses).reduce((n, b) => n + b.total, 0) : 0;
  const sum = (k: "published" | "draft" | "review" | "changes") => Object.values(stats.books).reduce((n, b) => n + b[k], 0);
  const done = sum("published");
  const ongoing = sum("draft") + sum("review") + sum("changes");
  const maxWeek = Math.max(1, ...stats.weekly.map((w) => w.revisions));
  const weeks: (WorkshopStats["weekly"][number] | null)[] = [...Array(Math.max(0, 12 - stats.weekly.length)).fill(null), ...stats.weekly.slice(-12)];

  return (
    <div className="space-y-8">
      {user?.isRoot && corpus === "lxx" && <ImportLxx published={done} />}

      <section className="grid gap-4 wide:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-box border border-base-300 p-5">
          <p className="text-sm text-base-content/55">Traduction maison · {config.label}</p>
          <p className="mt-1 flex items-baseline gap-3">
            <span className="text-4xl font-bold tabular-nums">{verses ? `${pct(done, totalVerses).toLocaleString("fr-FR")} %` : "…"}</span>
            <span className="text-sm text-base-content/55">
              {done.toLocaleString("fr-FR")} verset{done > 1 ? "s" : ""} publié{done > 1 ? "s" : ""}
              {verses ? ` sur ${totalVerses.toLocaleString("fr-FR")}` : ""} · {ongoing} en cours
            </span>
          </p>
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-base-200">
            <span className="bg-success" style={{ width: `${pct(done, totalVerses)}%` }} />
            <span className="bg-warning/70" style={{ width: `${pct(ongoing, totalVerses)}%` }} />
          </div>
          <div className="mt-5">
            <p className="mb-1 text-xs text-base-content/50">Versets publiés par semaine</p>
            <div className="flex h-16 items-end gap-1.5">
              {weeks.map((w, i) => (
                <span key={i} title={w ? `${w.revisions} le ${w.week}` : undefined} className="flex-1 rounded-t bg-primary/60" style={{ height: w ? `${Math.max(6, (w.revisions / maxWeek) * 100)}%` : "2px", opacity: w ? 1 : 0.25 }} />
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-box border border-base-300 p-5">
          <h3 className="text-sm font-semibold">Traducteurs</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {stats.translators.map((t) => (
              <li key={t.name} className="flex justify-between">
                <span>{t.name}</span>
                <span className="tabular-nums text-base-content/55">{t.published.toLocaleString("fr-FR")}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 wide:grid-cols-4">
        <Queue title="À relire" items={stats.queue.toReview} corpus={corpus} tone="bg-info/15 text-info" />
        <Queue title="À corriger" items={stats.queue.changes} corpus={corpus} tone="bg-warning/20" />
        <Queue title="Mes brouillons" items={stats.queue.drafts} corpus={corpus} tone="bg-base-200" />
        {stats.queue.waiting > 0 && (
          <section className="rounded-box border border-base-300 p-4 text-sm">
            <h3 className="font-semibold">En attente de relecture</h3>
            <p className="mt-2 text-base-content/60">{stats.queue.waiting} de vos versets attendent un relecteur.</p>
          </section>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-base-content/50">Livres</h2>
        <ul className="divide-y divide-base-300 rounded-box border border-base-300">
          {books.map((b) => {
            const total = verses?.[b.id]?.total ?? 0;
            const s = stats.books[b.id] ?? { published: 0, draft: 0, review: 0, changes: 0 };
            const busy = s.draft + s.review + s.changes;
            const expanded = open === b.id;
            return (
              <li key={b.id}>
                <button type="button" onClick={() => setOpen(expanded ? null : b.id)} className="grid w-full grid-cols-[9rem_minmax(0,1fr)_7rem] items-center gap-4 px-4 py-2.5 text-left hover:bg-base-200/50 sm:grid-cols-[12rem_minmax(0,1fr)_9rem]">
                  <span className="truncate font-medium">{config.bookNames[b.id] ?? b.name}</span>
                  <span className="flex h-1.5 overflow-hidden rounded-full bg-base-200">
                    <span className="bg-success" style={{ width: `${pct(s.published, total)}%` }} />
                    <span className="bg-warning/70" style={{ width: `${pct(busy, total)}%` }} />
                  </span>
                  <span className="text-right text-xs tabular-nums text-base-content/55">
                    {s.published} / {total}
                    {busy ? ` · ${busy} en cours` : ""}
                  </span>
                </button>
                {expanded && verses?.[b.id] && (
                  <div className="flex flex-wrap gap-1.5 px-4 pb-4">
                    {Object.entries(verses[b.id].chapters).map(([ch, n]) => {
                      const got = Object.keys(published[b.id] ?? {}).filter((r) => r.startsWith(`${ch}:`)).length;
                      const ratio = n ? got / n : 0;
                      return (
                        <Link
                          key={ch}
                          href={`?corpus=${corpus}&book=${b.id}&ch=${ch}`}
                          title={`${got} / ${n} versets`}
                          className={`grid h-9 w-9 place-items-center rounded-md text-xs tabular-nums ${ratio >= 1 ? "bg-success text-success-content" : ratio > 0 ? "bg-success/30" : "bg-base-200 hover:bg-base-300"}`}
                        >
                          {ch}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
