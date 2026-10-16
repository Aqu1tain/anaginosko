import type { EditorialRole } from "@/src/lib/api";

const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 864e5],
  ["month", 30 * 864e5],
  ["week", 7 * 864e5],
  ["day", 864e5],
  ["hour", 36e5],
  ["minute", 6e4],
];

// « il y a 3 jours », « hier », « à l'instant ».
export function relative(date: string | null | undefined): string | null {
  if (!date) return null;
  const diff = new Date(date.replace(" ", "T")).getTime() - Date.now();
  if (Number.isNaN(diff)) return null;
  const step = STEPS.find(([, ms]) => Math.abs(diff) >= ms);
  return step ? rtf.format(Math.round(diff / step[1]), step[0]) : "à l’instant";
}

export const day = (date: string | null | undefined) =>
  date ? new Date(date.replace(" ", "T")).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";

export const roleNamesOf = (roleIds: number[] | undefined, roles: EditorialRole[]) =>
  roles.filter((r) => roleIds?.includes(r.id)).map((r) => r.name);

export const matches = (q: string, ...fields: string[]) => {
  const needle = q.trim().toLowerCase();
  return !needle || fields.some((f) => f.toLowerCase().includes(needle));
};
