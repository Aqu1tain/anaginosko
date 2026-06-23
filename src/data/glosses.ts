import data from "./glosses.json";

export type Gloss = { excerpt: string; uri: string };

const glosses = data as Record<string, Gloss>;

export const glossFor = (lemma: string | null | undefined): Gloss | undefined =>
  lemma ? glosses[lemma] : undefined;
