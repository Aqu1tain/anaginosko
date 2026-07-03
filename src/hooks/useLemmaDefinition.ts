"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAnnotations, type Annotation } from "../lib/api";

// Définition Biblion d'un lemme (ref « def:<lemma> »), système à part des
// annotations et prioritaire sur Bailly. Au plus une définition active par
// lemme : on prend la première. undefined = chargement, null = aucune.
export function useLemmaDefinition(lemma: string | null | undefined) {
  const [definition, setDefinition] = useState<Annotation | null | undefined>(undefined);
  const ref = lemma ? `def:${lemma}` : null;

  const reload = useCallback(() => {
    if (!ref) {
      setDefinition(null);
      return;
    }
    let alive = true;
    fetchAnnotations(ref)
      .then((rows) => alive && setDefinition(rows[0] ?? null))
      .catch(() => alive && setDefinition(null));
    return () => {
      alive = false;
    };
  }, [ref]);

  useEffect(() => reload(), [reload]);

  return { definition, reload };
}
