"use client";

import { useCallback, useMemo } from "react";
import GreekText from "@/src/components/GreekText";
import ReportButton from "@/src/components/ReportButton";
import { useAnnotationMaps } from "@/src/hooks/useAnnotationMaps";
import type { Text } from "@/src/data/texts";
import { parseRef } from "@/src/data/corpus";
import { verseLabel } from "@/src/data/canon";

// Versets d'une lecture, grec et traduction en regard. Le grec reçoit le chapitre
// entier pour que les annotations (indexées par mot dans le chapitre) tombent juste.
export default function PassageGreek({ text, verses, french }: { text: Text; verses: number[]; french: Record<string, string> | null }) {
  const { maps } = useAnnotationMaps(text.id, text.mots, true);
  const place = useMemo(() => parseRef(text.id), [text.id]);
  const labelOf = useCallback((v: number) => (place ? verseLabel(place.book, place.chapter, v) : String(v)), [place]);
  return (
    <div>
      {verses.map((v) => (
        <div key={v} className="trans-row group border-b border-base-300/70 py-3 last:border-0">
          <div className="trans-grec">
            <GreekText
              text={text}
              size="md"
              scale={0.92}
              verseOnly={v}
              verseLabel={labelOf}
              spanWords={maps?.spanWords}
              charSpots={maps?.charSpots}
              markers={maps?.markers}
            />
          </div>
          <div className="trans-fr leading-relaxed text-base-content/85">
            {french?.[v] && (
              <>
                <span className="verse-num">{labelOf(v)}</span>
                {french[v]}
              </>
            )}
            <span className="ml-1 inline-flex align-middle">
              <ReportButton
                label={`Signaler une erreur au verset ${v}`}
                target={{
                  ref: text.id,
                  verse: v,
                  wordIndex: null,
                  endWordIndex: null,
                  graphemeIndex: null,
                  annotationId: null,
                  scopeLabel: "verset",
                  categories: ["traduction", "texte", "demande_note"],
                }}
              />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
