import { useEffect, useState } from "react";
import { audioKey, loadAudioManifest } from "../lib/audio";

// Indique si le son d'une translittération est disponible (présent dans le
// manifeste). Tant que le manifeste n'est pas chargé, renvoie false (on n'affiche
// pas un bouton qui ne marcherait pas).
export function useHasAudio(translit: string): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let alive = true;
    loadAudioManifest().then((set) => {
      if (alive) setAvailable(set.has(audioKey(translit)));
    });
    return () => {
      alive = false;
    };
  }, [translit]);
  return available;
}
