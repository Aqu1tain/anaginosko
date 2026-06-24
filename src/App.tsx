import { useCallback, useEffect, useMemo, useState } from "react";
import { useHashRoute } from "./hooks/useHashRoute";
import { usePersistentState } from "./hooks/usePersistentState";
import { textById } from "./data/texts";
import {
  SheetContext,
  type ActiveLetter,
  type LetterClick,
  type SheetApi,
  type SheetStage,
} from "./components/SheetContext";
import type { GraphemeInfo } from "./lib/greek";
import type { WordContext } from "./lib/tokenize";
import TopBar from "./components/TopBar";
import Library from "./components/Library";
import Reader from "./components/Reader";
import AlphabetView from "./components/AlphabetView";
import ConcordanceView from "./components/ConcordanceView";
import MentionsView from "./components/MentionsView";
import LetterSheet from "./components/LetterSheet";
import TabBar from "./components/TabBar";

const prefersDark =
  typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches;

type SheetState = {
  key: string;
  w: number;
  g: number;
  info: GraphemeInfo;
  word: WordContext | null;
  stage: SheetStage;
};

export default function App() {
  const route = useHashRoute();
  const [dark, setDark] = usePersistentState<boolean>("anaginosko:dark", prefersDark);
  const [sheet, setSheet] = useState<SheetState | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      dark ? "anaginosko-dark" : "anaginosko",
    );
  }, [dark]);

  // Fermer la fiche quand on change d'écran.
  useEffect(() => {
    setSheet(null);
  }, [route]);

  // Garde la lettre active visible AU-DESSUS de la feuille (ancrée en bas) — en
  // layout mobile/tablette seulement (sur desktop la fiche flotte à droite). On
  // re-mesure à chaque étape car la feuille grandit au 2e clic.
  useEffect(() => {
    if (!sheet) return;
    if (window.matchMedia("(min-width: 86rem)").matches) return;
    const id = requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(".glyph.is-active");
      const sheetEl = document.querySelector<HTMLElement>('[role="dialog"]');
      if (!el || !sheetEl) return;
      const g = el.getBoundingClientRect();
      const top = sheetEl.getBoundingClientRect().top;
      const margin = 24;
      // cible : la lettre juste au-dessus du haut de la feuille (sans passer sous la barre).
      const targetTop = Math.max(72, top - margin - g.height);
      if (Math.abs(g.top - targetTop) > 8) {
        window.scrollBy({ top: g.top - targetTop, behavior: "smooth" });
      }
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet?.key, sheet?.stage]);

  const clickLetter = useCallback(({ w, g, info, word }: LetterClick) => {
    const key = `${w}:${g}`;
    setSheet((prev) => {
      if (!prev || prev.key !== key) return { key, w, g, info, word, stage: 1 };
      if (prev.stage === 1) return { ...prev, stage: 2 };
      return null; // 3e clic : on ferme
    });
  }, []);

  const closeSheet = useCallback(() => setSheet(null), []);

  const openLetter = useCallback((info: GraphemeInfo) => {
    setSheet({
      key: `alpha:${info.letter?.name ?? info.cluster}`,
      w: -1,
      g: -1,
      info,
      word: null,
      stage: 1,
    });
  }, []);

  const active: ActiveLetter | null = sheet
    ? { key: sheet.key, w: sheet.w, g: sheet.g, stage: sheet.stage }
    : null;

  const api = useMemo<SheetApi>(
    () => ({ active, clickLetter, openLetter }),
    [active, clickLetter, openLetter],
  );

  const text = route.name === "text" ? textById(route.id) : undefined;
  // Section grossière : la transition de vue ne se joue qu'au changement d'onglet,
  // pas entre deux textes ou deux lemmes.
  const section = route.name === "text" ? "library" : route.name;

  return (
    <SheetContext.Provider value={api}>
      <div className="min-h-dvh bg-base-100 text-base-content">
        <TopBar route={route} text={text} dark={dark} onToggleTheme={() => setDark((d) => !d)} />
        <main
          className={`mx-auto w-full max-w-2xl px-4 ${
            sheet ? "pb-[65vh] wide:pb-16" : "pb-[calc(5rem+env(safe-area-inset-bottom))] wide:pb-16"
          }`}
        >
          <div key={section} className="animate-view">
            {route.name === "library" && <Library />}
            {route.name === "alphabet" && <AlphabetView />}
            {route.name === "concordance" && <ConcordanceView lemma={route.lemma} />}
            {route.name === "mentions" && <MentionsView />}
            {route.name === "text" &&
              (text ? <Reader text={text} highlight={route.highlight} /> : <NotFound />)}
          </div>
        </main>
        <TabBar route={route} />
      </div>
      {sheet && (
        <LetterSheet
          info={sheet.info}
          word={sheet.word}
          stage={sheet.stage}
          onClose={closeSheet}
        />
      )}
    </SheetContext.Provider>
  );
}

function NotFound() {
  return (
    <div className="py-20 text-center text-base-content/60">
      <p>Texte introuvable.</p>
      <a href="#/" className="link link-primary mt-3 inline-block">
        Retour à la bibliothèque
      </a>
    </div>
  );
}
