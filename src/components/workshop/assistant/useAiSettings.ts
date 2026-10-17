"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchSettings, saveSettings, type ModelPick, type Settings } from "@/src/lib/aiApi";

// Clés et modèles choisis du compte ; un changement de modèle ou d'effort est enregistré aussitôt.
export function useAiSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");

  const reload = useCallback(
    () =>
      fetchSettings()
        .then(setSettings)
        .catch((e) => setError((e as Error).message)),
    [],
  );
  useEffect(() => {
    reload();
  }, [reload]);

  const choose = async (kind: "analysis" | "draft", pick: ModelPick) => {
    setError("");
    setSettings((s) => (s ? { ...s, [kind]: pick } : s));
    try {
      const saved = await saveSettings({ [kind]: pick });
      setSettings((s) => (s ? { ...s, ...saved } : s));
    } catch (e) {
      setError((e as Error).message);
      reload();
    }
  };

  return { settings, error, reload, choose };
}
