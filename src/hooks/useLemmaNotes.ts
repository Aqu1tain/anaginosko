"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAnnotations, type Annotation } from "../lib/api";

// Notes philologiques attachées à un lemme (ref « lemma:<lemma> »). Partagé entre
// la fiche de concordance et la feuille de mot du lecteur. notes = null tant qu'on
// charge, [] si aucune.
export function useLemmaNotes(lemma: string | null | undefined) {
  const [notes, setNotes] = useState<Annotation[] | null>(null);
  const ref = lemma ? `lemma:${lemma}` : null;

  const reload = useCallback(() => {
    if (!ref) {
      setNotes([]);
      return;
    }
    let alive = true;
    fetchAnnotations(ref)
      .then((rows) => alive && setNotes(rows))
      .catch(() => alive && setNotes([]));
    return () => {
      alive = false;
    };
  }, [ref]);

  useEffect(() => reload(), [reload]);

  return { notes, reload };
}
