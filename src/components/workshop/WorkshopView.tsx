"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/src/hooks/useAuth";
import { can } from "@/src/lib/api";
import ArbitrageView from "@/src/components/ArbitrageView";
import type { WorkCorpus } from "@/src/lib/workshopApi";
import ChapterWorkbench from "./ChapterWorkbench";
import WorkshopHome from "./WorkshopHome";
import Glossary from "./Glossary";

const CORPORA: [WorkCorpus, string][] = [
  ["nt", "Nouveau Testament"],
  ["lxx", "Septante"],
];

// Atelier de traduction : pilotage, glossaire, éditeur de chapitre ; l'ancien outil
// d'alignement Giguet reste joignable pour la Septante.
export default function WorkshopView() {
  const { user, ready } = useAuth();
  const params = useSearchParams();
  const corpus: WorkCorpus = params.get("corpus") === "lxx" ? "lxx" : "nt";
  const book = params.get("book");
  const chapter = Number(params.get("ch"));
  const tab = params.get("tab") === "glossaire" ? "glossaire" : "pilotage";

  if (!ready) return null;
  if (!can(user, "arbitrage")) return <p className="py-20 text-center text-base-content/60">Réservé aux traducteurs.</p>;

  if (params.get("mode") === "alignement") {
    return (
      <div>
        <Link href={`?corpus=lxx${book ? `&book=${book}&ch=${chapter}` : ""}`} className="mt-4 inline-block text-sm text-base-content/55 hover:text-base-content">
          ← Atelier
        </Link>
        <ArbitrageView />
      </div>
    );
  }
  if (book && chapter > 0) return <ChapterWorkbench key={`${corpus}/${book}/${chapter}`} corpus={corpus} book={book} chapter={chapter} />;

  const link = (patch: Record<string, string>) => `?${new URLSearchParams({ corpus, ...(tab === "glossaire" ? { tab } : {}), ...patch })}`;

  return (
    <div className="space-y-6 pb-16 pt-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Atelier de traduction</h1>
        <div className="flex gap-1 rounded-full bg-base-200 p-1 text-sm">
          {CORPORA.map(([id, label]) => (
            <Link
              key={id}
              href={link({ corpus: id })}
              aria-current={corpus === id ? "true" : undefined}
              className={`rounded-full px-3 py-1 font-medium ${corpus === id ? "bg-base-100 shadow-sm" : "text-base-content/60 hover:text-base-content"}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </header>
      <nav className="flex gap-1 border-b border-base-300 text-sm" aria-label="Atelier">
        {[
          ["pilotage", "Pilotage", `?corpus=${corpus}`],
          ["glossaire", "Glossaire", `?corpus=${corpus}&tab=glossaire`],
        ].map(([k, label, href]) => (
          <Link key={k} href={href} className={`relative px-3 py-2 font-medium ${tab === k ? "" : "text-base-content/55 hover:text-base-content"}`}>
            {label}
            {tab === k && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
          </Link>
        ))}
        {corpus === "lxx" && (
          <Link href="?mode=alignement&corpus=lxx" className="ml-auto px-3 py-2 text-base-content/55 hover:text-base-content">
            Alignement Giguet
          </Link>
        )}
      </nav>
      {tab === "glossaire" ? <Glossary /> : <WorkshopHome corpus={corpus} />}
    </div>
  );
}
