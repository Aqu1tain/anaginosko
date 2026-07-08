// Types pour le module de matérialisation par-ref partagé (lib/lxx-materialize.mjs).
export type Source = [number, number] | [number, number, number, number];
type GiguetBook = Record<string, Record<string, string>>; // ch -> v -> texte

export function giguetWords(gbook: GiguetBook, ch: number, v: number): string[] | null;
export function sliceSource(gbook: GiguetBook, s: Source): string | null;
export function materializeSources(gbook: GiguetBook, sources: Source[]): string;
export function isMarkerSegment(text: string): boolean;
export function markerReason(text: string): "marqueur" | "ponctuation";
