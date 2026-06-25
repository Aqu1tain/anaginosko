"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider } from "../src/hooks/useAuth";
import {
  SheetContext,
  type ActiveLetter,
  type LetterClick,
  type SheetApi,
  type SheetStage,
} from "../src/components/SheetContext";
import type { GraphemeInfo } from "../src/lib/greek";
import type { WordContext } from "../src/lib/tokenize";
import LetterSheet from "../src/components/LetterSheet";

type SheetState = {
  key: string;
  w: number;
  g: number;
  info: GraphemeInfo;
  word: WordContext | null;
  stage: SheetStage;
};

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sheet, setSheet] = useState<SheetState | null>(null);

  // Fermer la fiche quand on change d'écran.
  useEffect(() => {
    setSheet(null);
  }, [pathname]);

  // Garde la lettre active visible au-dessus de la feuille (mobile/tablette).
  useEffect(() => {
    if (!sheet) return;
    if (window.matchMedia("(min-width: 86rem)").matches) return;
    const id = requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(".glyph.is-active");
      const sheetEl = document.querySelector<HTMLElement>('[role="dialog"]');
      if (!el || !sheetEl) return;
      const g = el.getBoundingClientRect();
      const sheetTop = sheetEl.getBoundingClientRect().top;
      const margin = 16;
      const topBar = 64;
      let delta = 0;
      if (g.bottom > sheetTop - margin) delta = g.bottom - (sheetTop - margin);
      else if (g.top < topBar) delta = g.top - topBar;
      if (Math.abs(delta) > 4) window.scrollBy({ top: delta, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet?.key, sheet?.stage]);

  const clickLetter = useCallback(({ w, g, info, word }: LetterClick) => {
    const key = `${w}:${g}`;
    setSheet((prev) => {
      if (!prev || prev.key !== key) return { key, w, g, info, word, stage: 1 };
      if (prev.stage === 1) return { ...prev, stage: 2 };
      return null;
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

  return (
    <AuthProvider>
      <SheetContext.Provider value={api}>
        {children}
        {sheet && (
          <LetterSheet info={sheet.info} word={sheet.word} stage={sheet.stage} onClose={closeSheet} />
        )}
      </SheetContext.Provider>
    </AuthProvider>
  );
}
