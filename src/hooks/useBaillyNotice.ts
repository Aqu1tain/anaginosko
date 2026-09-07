"use client";

import { useEffect, useState } from "react";
import type { BaillyNotice } from "../lib/bailly";

// Notice Bailly complète, chargée à la demande via notre proxy. undefined =
// chargement, null = indisponible. Mémorisée par uri pour la session.
const cache = new Map<string, BaillyNotice | null>();

export function useBaillyNotice(uri: string | null | undefined, enabled: boolean) {
  const [notice, setNotice] = useState<BaillyNotice | null | undefined>(() =>
    uri && enabled ? cache.get(uri) : undefined,
  );

  useEffect(() => {
    if (!enabled || !uri) return;
    if (cache.has(uri)) {
      setNotice(cache.get(uri));
      return;
    }
    let alive = true;
    setNotice(undefined);
    fetch(`/concordance/api/bailly/${encodeURIComponent(uri)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { notice?: BaillyNotice | null } | null) => {
        const value = json?.notice ?? null;
        cache.set(uri, value);
        if (alive) setNotice(value);
      })
      .catch(() => {
        if (alive) setNotice(null);
      });
    return () => {
      alive = false;
    };
  }, [uri, enabled]);

  return { notice, loading: enabled && notice === undefined };
}
