"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Breadcrumb from "../../app/_components/Breadcrumb";
import DistributionProfile from "./DistributionProfile";
import { glossFor } from "../data/glosses";
import {
  BOOK_NAMES,
  type Distribution,
  type LemmaEntry,
  type NtBook,
  type Occ,
} from "../data/nt";

// Met en forme la notation Bailly : « || » sépare les grands sens, on met en
// gras la vedette et les repères (A, I, 1…).
function formatDefinition(text: string): React.ReactNode {
  const segments = text.split(/\s*\|\|\s*/).map((s) => s.trim()).filter(Boolean);
  return segments.map((seg, i) => {
    if (i === 0) {
      const close = seg.indexOf(")");
      if (close !== -1) {
        return (
          <p key={i} className="font-greek text-[0.95rem] leading-relaxed text-base-content/85">
            <strong className="font-semibold">{seg.slice(0, close + 1)}</strong>
            {seg.slice(close + 1)}
          </p>
        );
      }
    }
    const m = seg.match(/^([A-D]|[IVX]{1,4}|\d+)(\b.*)$/s);
    return (
      <p key={i} className="font-greek text-[0.95rem] leading-relaxed text-base-content/85">
        {m ? <><strong className="text-accent">{m[1]}</strong>{m[2]}</> : seg}
      </p>
    );
  });
}

// Définition Bailly : excerpt bundlé rendu côté serveur (indexable), puis
// définition complète récupérée en direct côté client.
function Definition({ lemma }: { lemma: string }) {
  const bundled = glossFor(lemma);
  const [text, setText] = useState<string | null>(bundled?.excerpt ?? null);
  const [uri, setUri] = useState<string | null>(bundled?.uri ?? null);
  const [state, setState] = useState<"loading" | "done" | "absent">("loading");

  useEffect(() => {
    let alive = true;
    setState("loading");
    (async () => {
      try {
        const look = await fetch(`https://api.bailly.app/lookup/${encodeURIComponent(lemma)}`).then((r) => r.json());
        const entry = (look?.data?.entries ?? []).find((e: { isMorpheus?: boolean }) => !e.isMorpheus) ?? look?.data?.entries?.[0];
        if (!entry) { if (alive) setState(text ? "done" : "absent"); return; }
        const full = await fetch(`https://api.bailly.app/entry/${encodeURIComponent(entry.uri)}?fields=definition`).then((r) => r.json());
        if (!alive) return;
        setText(full?.data?.entry?.definition ?? entry.excerpt ?? text);
        setUri(entry.uri);
        setState("done");
      } catch {
        if (alive) setState(text ? "done" : "absent");
      }
    })();
    return () => { alive = false; };
  }, [lemma]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state === "absent" && !text) return null;
  return (
    <div className="mt-3 rounded-box bg-base-200 px-4 py-3">
      <div className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/70">
        Définition · Bailly
      </div>
      {text ? (
        <div className="mt-1.5 space-y-1.5">{formatDefinition(text)}</div>
      ) : (
        <p className="mt-1 text-sm text-base-content/70">Recherche…</p>
      )}
      {state === "loading" && text && (
        <p className="mt-1 text-xs text-base-content/70">… définition complète en cours</p>
      )}
      {(uri || bundled) && (
        <a
          className="link mt-2 inline-block text-xs text-base-content/70"
          href={`https://bailly.app/${encodeURIComponent(lemma)}`}
          target="_blank"
          rel="noreferrer"
        >
          Bailly 2020 (CC BY-NC-ND) ↗
        </a>
      )}
    </div>
  );
}

function Occurrences({ entry, occ }: { entry: LemmaEntry; occ: Occ[] }) {
  return (
    <div className="mt-4 grid gap-1.5">
      {entry.count > occ.length && (
        <p className="text-sm text-base-content/70">
          {occ.length} premières occurrences sur {entry.count}.
        </p>
      )}
      {occ.map((o, i) => (
        <Link
          key={i}
          href={`/nt/${o.b}/${o.c}?w=${o.w}`}
          className="flex items-center gap-3 rounded-box border border-base-300 bg-base-100 px-3.5 py-2.5 transition-colors hover:border-primary/40"
        >
          <span className="font-greek min-w-0 flex-1 truncate text-lg">{o.f}</span>
          <span className="shrink-0 text-sm text-base-content/70">
            {BOOK_NAMES[o.b] ?? o.b} {o.c}:{o.v}
          </span>
        </Link>
      ))}
    </div>
  );
}

export default function LemmaDetail({
  entry,
  occ,
  dist,
  books,
}: {
  entry: LemmaEntry;
  occ: Occ[];
  dist: Distribution;
  books: NtBook[];
}) {
  return (
    <div className="pb-4">
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/", home: true },
          { label: "Concordance", href: "/concordance" },
          { label: entry.lemma, greek: true },
        ]}
      />
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-greek text-3xl">{entry.lemma}</h1>
        <span className="text-sm text-base-content/70">{entry.translitR}</span>
        <span className="text-xs text-base-content/70">érasmien&nbsp;: {entry.translit}</span>
        <span className="text-sm text-base-content/70">· {entry.nature}</span>
      </div>
      <p className="mt-1 text-sm text-base-content/70">
        {entry.count} occurrence{entry.count > 1 ? "s" : ""} dans le NT
      </p>
      <Definition lemma={entry.lemma} />
      <DistributionProfile entry={entry} dist={dist} books={books} occ={occ} />
      <Occurrences entry={entry} occ={occ} />
    </div>
  );
}
