export type EstherAddition = {
  id: string;
  title: string;
  units: string[];
  readAfter?: { chapter: number; verse: number };
};

export const ESTHER_ADDITIONS: EstherAddition[];
export const ESTHER_CHAPTER_ORDER: (number | string)[];
export const ESTHER_RAHLFS_LABELS: string[];
export function estherAddition(id: number | string): EstherAddition | null;
export function isEstherAddition(book: string, chapter: number | string): boolean;
export function estherTarget(label: string): { chapter: number | string; verse: number } | null;
export function rahlfsLabel(chapter: number | string, verse: number): string | null;
export function estherReadAfter(chapter: number | string): Map<number, EstherAddition>;
