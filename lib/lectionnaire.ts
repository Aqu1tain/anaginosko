import "server-only";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { Text } from "../src/data/texts";
import { NT, LXX } from "../src/data/corpus";
import { loadChapterFs } from "./nt-server";

// Lectionnaires précalculés (scripts/lectionnaire) : des références seulement,
// résolues ici dans le corpus du site (grec et traduction).

export type Passage = { corpus: "nt" | "lxx"; book: string; chapter: number; from: number; to: number; absent?: boolean };
export type Reading = { kind: string; label: string; ref: string; passages: Passage[]; alternative?: boolean };
export type Mass = { name?: string; readings: Reading[] };
export type Day = { title: string; detail?: string; color?: string; note?: string; masses: Mass[] };

export const RITES = [
  { slug: "ordinaire", dir: "romain", label: "Forme ordinaire", note: "" },
  { slug: "extraordinaire", dir: "1962", label: "Forme extraordinaire", note: "Missel romain de 1962." },
  { slug: "byzantin", dir: "byzantin", label: "Rite byzantin", note: "Usage grec-catholique, Pâques à la date grégorienne." },
] as const;

export type Rite = (typeof RITES)[number];

export const riteBySlug = (slug: string): Rite | undefined => RITES.find((r) => r.slug === slug);

const dataDir = path.join(process.cwd(), "data", "lectionnaire");
type Year = { source: string; days: Record<string, Day> };
const years = new Map<string, Promise<Year>>();

const loadYear = (dir: string, year: number) => {
  const key = `${dir}/${year}`;
  if (!years.has(key)) {
    years.set(
      key,
      readFile(path.join(dataDir, dir, `${year}.json`), "utf8")
        .then((raw) => JSON.parse(raw) as Year)
        .catch(() => ({ source: "", days: {} })),
    );
  }
  return years.get(key)!;
};

export async function loadDay(rite: Rite, iso: string): Promise<(Day & { source: string }) | null> {
  const year = await loadYear(rite.dir, Number(iso.slice(0, 4)));
  const day = year.days[iso];
  return day ? { ...day, source: year.source } : null;
}

const ranges = new Map<string, Promise<{ first: string; last: string } | null>>();

export function riteRange(rite: Rite) {
  if (!ranges.has(rite.dir)) {
    ranges.set(
      rite.dir,
      readdir(path.join(dataDir, rite.dir))
        .then(async (files) => {
          const ys = files.filter((f) => /^\d{4}\.json$/.test(f)).map((f) => Number(f.slice(0, 4))).sort();
          if (!ys.length) return null;
          const first = Object.keys((await loadYear(rite.dir, ys[0])).days).sort()[0];
          const last = Object.keys((await loadYear(rite.dir, ys[ys.length - 1])).days).sort().at(-1);
          return first && last ? { first, last } : null;
        })
        .catch(() => null),
    );
  }
  return ranges.get(rite.dir)!;
}

export const daysWithReadings = async (rite: Rite, isos: string[]) => {
  const found = await Promise.all(isos.map((iso) => loadDay(rite, iso)));
  return new Set(isos.filter((_, i) => found[i]));
};

// Un passage résolu : le chapitre entier (les annotations y sont indexées par mot),
// les versets lus et leur traduction.
export type ResolvedPassage = Passage & {
  text: Text | null;
  verses: number[];
  french: Record<string, string> | null;
  maison: Record<string, string> | null;
  frenchBlock: boolean;
};

async function resolvePassage(p: Passage): Promise<ResolvedPassage> {
  if (p.absent) return { ...p, text: null, verses: [], french: null, maison: null, frenchBlock: false };
  const chapter = await loadChapterFs(p.book, p.chapter, p.corpus === "lxx" ? LXX : NT);
  const inRange = (v: number | null) => v != null && v >= p.from && v <= p.to;
  const verses = [...new Set((chapter.mots ?? []).filter((m) => inRange(m.verse)).map((m) => m.verse as number))];
  const pick = <T,>(rec: Record<string, T> | null | undefined) =>
    rec ? Object.fromEntries(Object.entries(rec).filter(([v]) => inRange(Number(v)))) : null;
  return {
    ...p,
    text: { ...chapter, francais: null, maison: null },
    verses,
    french: pick(chapter.francais),
    maison: pick(chapter.maison),
    frenchBlock: Boolean(chapter.frenchBlock),
  };
}

export type ResolvedReading = Reading & { resolved: ResolvedPassage[] };

export const resolveReading = async (r: Reading): Promise<ResolvedReading> => ({
  ...r,
  resolved: await Promise.all(r.passages.map(resolvePassage)),
});

// Dates : ISO « AAAA-MM-JJ », calculées en UTC pour éviter les décalages d'heure.
export const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && toIso(new Date(`${s}T00:00:00Z`)) === s;

export const toIso = (d: Date) => d.toISOString().slice(0, 10);

export const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
};

export const todayInParis = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export const weekOf = (iso: string) => {
  const monday = addDays(iso, -((new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
};

const longDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export const formatLongDate = (iso: string) => {
  const s = longDate.format(new Date(`${iso}T00:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
};
