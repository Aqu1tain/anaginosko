export type VerseQuoteProps = {
  corpus: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  showFrench: boolean;
};

export type ChapterRefProps = {
  corpus: string;
  book: string;
  chapter: number;
  form: "short" | "long";
};

export type VerseLine = { v: number; greek: string; french: string | null };
