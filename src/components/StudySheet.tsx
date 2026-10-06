"use client";

import type { GraphemeInfo } from "../lib/greek";
import type { WordContext } from "../lib/tokenize";
import StudyPanel from "./study/StudyPanel";
import WordDetail from "./study/WordDetail";
import LetterDetail from "./study/LetterDetail";

// Panneau d'étude global : le mot touché dans un texte, ou une lettre de l'alphabet.
export default function StudySheet({
  info,
  word,
  textRef,
  wordIndex,
  verse,
  onClose,
}: {
  info: GraphemeInfo;
  word: WordContext | null;
  textRef: string | null;
  wordIndex: number;
  verse: number | null;
  onClose: () => void;
}) {
  const label = word ? `Mot ${word.grec}` : `Lettre ${info.letter?.name ?? info.cluster}`;
  return (
    <StudyPanel label={label} onClose={onClose}>
      {word ? (
        <WordDetail key={`${textRef}:${wordIndex}`} word={word} textRef={textRef} wordIndex={wordIndex} verse={verse} />
      ) : (
        <div className="pr-10 pt-1">
          <LetterDetail info={info} />
        </div>
      )}
    </StudyPanel>
  );
}
