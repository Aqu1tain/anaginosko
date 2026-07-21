"use client";

import { useEffect, useMemo, useState } from "react";
import type { CorpusConfig } from "../data/corpus";
import {
  assessGloss,
  bundledGlossFor,
  type Gloss,
  type GlossAssessment,
} from "../data/glosses";

export type GlossLoadState = GlossAssessment & { loading: boolean };

const cache = new Map<string, Record<string, Gloss>>();
const pending = new Map<string, Promise<Record<string, Gloss>>>();

function loadCorpusGlosses(corpus: CorpusConfig): Promise<Record<string, Gloss>> {
  const cached = cache.get(corpus.id);
  if (cached) return Promise.resolve(cached);
  const existing = pending.get(corpus.id);
  if (existing) return existing;

  const request = fetch(`/${corpus.dataPrefix}/glosses.json`)
    .then((response) => (response.ok ? response.json() : {}))
    .then((rows) => {
      const glosses = rows as Record<string, Gloss>;
      cache.set(corpus.id, glosses);
      return glosses;
    })
    .catch(() => {
      const glosses: Record<string, Gloss> = {};
      cache.set(corpus.id, glosses);
      return glosses;
    })
    .finally(() => pending.delete(corpus.id));

  pending.set(corpus.id, request);
  return request;
}

/**
 * Charge le glossaire du corpus actif et provoque un nouveau rendu une fois les
 * données disponibles. L'ancien ntGlossFor lançait bien le fetch, mais ne
 * notifiait jamais React et chargeait toujours /nt, y compris depuis la LXX.
 */
export function useCorpusGloss(
  lemma: string | null | undefined,
  corpus: CorpusConfig,
): GlossLoadState {
  const initial = useMemo(() => {
    const bundled = corpus.id === "nt" ? bundledGlossFor(lemma) : undefined;
    return { ...assessGloss(lemma, bundled), loading: !!lemma };
  }, [corpus.id, lemma]);
  const [state, setState] = useState<GlossLoadState>(initial);

  useEffect(() => {
    let alive = true;
    setState(initial);
    if (!lemma) {
      setState({ status: "absent", gloss: null, loading: false });
      return () => {
        alive = false;
      };
    }

    loadCorpusGlosses(corpus).then((rows) => {
      if (alive) setState({ ...assessGloss(lemma, rows[lemma]), loading: false });
    });
    return () => {
      alive = false;
    };
  }, [corpus, initial, lemma]);

  return state;
}
