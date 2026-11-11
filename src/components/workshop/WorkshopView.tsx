"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/src/hooks/useAuth";
import { can } from "@/src/lib/api";
import ArbitrageView from "@/src/components/ArbitrageView";
import type { WorkCorpus } from "@/src/lib/workshopApi";
import { parseChapterId } from "@/src/data/corpus";
import ChapterWorkbench from "./ChapterWorkbench";
import WorkshopHome from "./WorkshopHome";
import Glossary from "./Glossary";
import CorpusChecks from "./CorpusChecks";
import SearchReplace from "./SearchReplace";
import Activity from "./Activity";
import GotoPalette from "./GotoPalette";
import Charter from "./Charter";
import SpaceShell, { SpaceLink, type NavGroup } from "@/src/components/admin/SpaceShell";
import { ICON } from "@/src/components/admin/icons";

const TABS = [
  ["pilotage", "Pilotage", ICON.overview],
  ["verifications", "Vérifications", ICON.checks],
  ["recherche", "Recherche", ICON.search],
  ["activite", "Activité", ICON.activity],
  ["glossaire", "Glossaire", ICON.glossary],
  ["charte", "Charte", ICON.charter],
] as const;
type Tab = (typeof TABS)[number][0] | "alignement";

const CORPORA: [WorkCorpus, string][] = [
  ["nt", "Nouveau Testament"],
  ["lxx", "Septante"],
];

const tabHref = (corpus: WorkCorpus, k: Tab) => (k === "alignement" ? "?mode=alignement&corpus=lxx" : k === "pilotage" ? `?corpus=${corpus}` : `?corpus=${corpus}&tab=${k}`);

function groupsFor(corpus: WorkCorpus, tab: Tab): NavGroup[] {
  const item = ([k, label, icon]: readonly [Tab, string, string]) => ({ href: tabHref(corpus, k), label, icon, active: tab === k });
  const [pilotage, checks, search, activity, glossary, charter] = TABS;
  return [
    { items: [item(pilotage)] },
    { label: "Révision", items: [item(checks), item(search), item(activity)] },
    { label: "Référence", items: [item(glossary), item(charter), ...(corpus === "lxx" ? [item(["alignement", "Alignement Giguet", ICON.align])] : [])] },
  ];
}

function CorpusSwitch({ corpus, tab }: { corpus: WorkCorpus; tab: Tab }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-base-200 p-1 text-sm">
      {CORPORA.map(([id, label]) => (
        <Link
          key={id}
          href={tabHref(id, tab === "alignement" ? "pilotage" : tab)}
          aria-current={corpus === id ? "true" : undefined}
          className={`flex min-h-9 items-center justify-center rounded-md px-2 text-center font-medium transition-colors ${corpus === id ? "bg-base-100 shadow-sm" : "text-base-content/80 hover:text-base-content"}`}
        >
          {id === "nt" ? "NT" : label}
        </Link>
      ))}
    </div>
  );
}

// Atelier de traduction : un espace à part, avec ses sections ; l'éditeur de
// chapitre prend toute la largeur.
export default function WorkshopView() {
  const { user, ready } = useAuth();
  const params = useSearchParams();
  const corpus: WorkCorpus = params.get("corpus") === "lxx" ? "lxx" : "nt";
  const book = params.get("book");
  const chapter = parseChapterId(params.get("ch") ?? "");
  const tab: Tab = params.get("mode") === "alignement" ? "alignement" : (TABS.find(([k]) => k === params.get("tab"))?.[0] ?? "pilotage");

  if (!ready) return null;
  if (!can(user, "arbitrage")) return <p className="py-20 text-center text-base-content/80">Réservé aux traducteurs.</p>;
  if (tab !== "alignement" && book && chapter) return <ChapterWorkbench key={`${corpus}/${book}/${chapter}`} corpus={corpus} book={book} chapter={chapter} />;

  const title = TABS.find(([k]) => k === tab)?.[1];

  return (
    <SpaceShell
      label="Atelier"
      groups={groupsFor(corpus, tab)}
      top={<CorpusSwitch corpus={corpus} tab={tab} />}
      footer={<SpaceLink href="/admin" label="Tableau de bord" icon={ICON.overview} />}
    >
      {tab === "alignement" ? (
        <ArbitrageView />
      ) : (
        <div className="space-y-6 pb-12 pt-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <GotoPalette corpus={corpus} />
          </header>
          {tab === "glossaire" ? (
            <Glossary />
          ) : tab === "charte" ? (
            <Charter corpus={corpus} />
          ) : tab === "verifications" ? (
            <CorpusChecks corpus={corpus} />
          ) : tab === "recherche" ? (
            <SearchReplace corpus={corpus} />
          ) : tab === "activite" ? (
            <Activity corpus={corpus} />
          ) : (
            <WorkshopHome corpus={corpus} />
          )}
        </div>
      )}
    </SpaceShell>
  );
}
