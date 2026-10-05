"use client";

import GreekText from "@/src/components/GreekText";
import { useAnnotationMaps } from "@/src/hooks/useAnnotationMaps";
import type { Text } from "@/src/data/texts";

// Versets d'une lecture, grec et traduction en regard. Le grec reçoit le chapitre
// entier pour que les annotations (indexées par mot dans le chapitre) tombent juste.
export default function PassageGreek({ text, verses, french }: { text: Text; verses: number[]; french: Record<string, string> | null }) {
  const { maps } = useAnnotationMaps(text.id, text.mots, true);
  return (
    <div>
      {verses.map((v) => (
        <div key={v} className="trans-row border-b border-base-300/70 py-3 last:border-0">
          <div className="trans-grec">
            <GreekText
              text={text}
              size="md"
              scale={0.92}
              verseOnly={v}
              spanWords={maps?.spanWords}
              charSpots={maps?.charSpots}
              markers={maps?.markers}
            />
          </div>
          <div className="trans-fr leading-relaxed text-base-content/85">
            {french?.[v] && (
              <>
                <span className="verse-num">{v}</span>
                {french[v]}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
