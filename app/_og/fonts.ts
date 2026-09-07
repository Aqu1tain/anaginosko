import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Polices pour les cartes OpenGraph (next/og). satori n'accepte PAS les webfonts
// CSS/next-font : il faut des buffers .ttf. Le grec polytonique vient de Gentium
// Plus (SIL, OFL). Mémoïsé au niveau module : lu une fois par processus.

export type OgFont = { name: string; data: Buffer; weight: 400 | 600 | 700 | 800; style: "normal" };

let cache: OgFont[] | null = null;

export async function ogFonts(): Promise<OgFont[]> {
  if (cache) return cache;
  const dir = join(process.cwd(), "app/_og");
  const [syne, inter, interSemi, gentium, gentiumBold] = await Promise.all([
    readFile(join(dir, "Syne-ExtraBold.ttf")),
    readFile(join(dir, "Inter-Regular.ttf")),
    readFile(join(dir, "Inter-SemiBold.ttf")),
    readFile(join(dir, "GentiumPlus-Regular.ttf")),
    readFile(join(dir, "GentiumPlus-Bold.ttf")),
  ]);
  cache = [
    { name: "Syne", data: syne, weight: 800, style: "normal" },
    { name: "Inter", data: inter, weight: 400, style: "normal" },
    { name: "Inter", data: interSemi, weight: 600, style: "normal" },
    { name: "Gentium", data: gentium, weight: 400, style: "normal" },
    { name: "Gentium", data: gentiumBold, weight: 700, style: "normal" },
  ];
  return cache;
}
