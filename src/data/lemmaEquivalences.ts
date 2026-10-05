import table from "./lemma-equivalences.json";

// Même mot cité sous une autre forme dans la Septante et dans le NT (φοβέω /
// φοβέομαι, σώζω / σῴζω) : table générée par scripts/build-lemma-equivalences.mjs.
const lxxToNt = new Map(Object.entries(table.lxxToNt));
const ntToLxx = new Map([...lxxToNt].map(([lxx, nt]) => [nt, lxx]));

export const ntLemmaFor = (lxxLemma: string): string => lxxToNt.get(lxxLemma) ?? lxxLemma;
export const lxxLemmaFor = (ntLemma: string): string => ntToLxx.get(ntLemma) ?? ntLemma;
