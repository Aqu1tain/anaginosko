"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { textById, type Mot } from "../data/texts";
import { loadChapter } from "../data/nt";
import { corpusById, parseRef } from "../data/corpus";
import { linkedRef, remapAnnotation, type PlacedAnnotation } from "../data/passageLink";
import { fetchAnnotations, type Annotation } from "../lib/api";

export type AnnotationMaps = {
  spanWords: Map<number, Annotation[]>;
  charSpots: Map<string, Annotation[]>;
  markers: Map<number, Annotation[]>;
};

// Annotations d'un texte et de son texte lié (passage ↔ chapitre NT), remappées
// sur ce texte, puis rangées en cartes de rendu pour GreekText : soulignement
// mot/phrase, soulignement caractère, pastilles. Les annotations liées gardent leur
// enregistrement d'origine pour l'édition et la suppression.
export function useAnnotationMaps(ref: string, mots: Mot[] | null, show: boolean) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [foreign, setForeign] = useState<PlacedAnnotation[]>([]);

  const loadAnnotations = useCallback(
    () => fetchAnnotations(ref).then(setAnnotations).catch(() => setAnnotations([])),
    [ref],
  );

  const loadForeign = useCallback(async () => {
    setForeign([]);
    const lref = linkedRef(ref);
    if (!lref || !mots) return;
    try {
      const p = parseRef(lref);
      const srcMots: Mot[] | null = p
        ? (await loadChapter(p.book, p.chapter, corpusById(p.corpus))).mots
        : (textById(lref)?.mots ?? null);
      if (!srcMots) return;
      const anns = await fetchAnnotations(lref);
      setForeign(
        anns
          .map((a) => remapAnnotation(a, srcMots, mots))
          .filter((p): p is PlacedAnnotation => p !== null),
      );
    } catch {
      /* lien indisponible : on garde les annotations natives seules */
    }
  }, [ref, mots]);

  const reload = useCallback(() => {
    loadAnnotations();
    loadForeign();
  }, [loadAnnotations, loadForeign]);

  useEffect(() => {
    loadAnnotations();
    loadForeign();
  }, [loadAnnotations, loadForeign]);

  const { maps, displayById } = useMemo(() => {
    const displayById = new Map<number, { w: number; end: number | null }>();
    if (!show) return { maps: null, displayById };
    const spanWords = new Map<number, Annotation[]>();
    const charSpots = new Map<string, Annotation[]>();
    const markers = new Map<number, Annotation[]>();
    const push = <K,>(m: Map<K, Annotation[]>, k: K, a: Annotation) =>
      m.set(k, [...(m.get(k) ?? []), a]);
    const place = (a: Annotation, w: number, end: number | null, g: number | null) => {
      displayById.set(a.id, { w, end });
      if (g != null) {
        push(charSpots, `${w}:${g}`, a);
        push(markers, w, a);
      } else if (end != null) {
        for (let x = w; x <= end; x += 2) push(spanWords, x, a);
        push(markers, end, a);
      } else {
        push(spanWords, w, a);
        push(markers, w, a);
      }
    };
    for (const a of annotations) {
      if (a.wordIndex == null) continue;
      place(a, a.wordIndex, a.endWordIndex, a.graphemeIndex);
    }
    for (const p of foreign) place(p.a, p.w, p.end, p.g);
    return { maps: { spanWords, charSpots, markers } as AnnotationMaps, displayById };
  }, [annotations, foreign, show]);

  return { maps, displayById, reload };
}
