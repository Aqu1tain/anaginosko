import { useEffect, useRef, useState } from "react";

// État persistant dans localStorage, sûr pour le SSR/hydratation : la PREMIÈRE
// peinture rend toujours `initial` (identique au rendu serveur), puis on lit
// localStorage après le montage. Sinon le rendu client diffèrerait du serveur
// (React #418).
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);

  // Lecture de la valeur stockée, une fois monté côté client.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore : localStorage indisponible (SSR, mode privé) */
    }
  }, [key]);

  // Persiste les changements ultérieurs. On saute le premier passage pour ne
  // pas écraser la valeur stockée avant de l'avoir lue ci-dessus.
  const firstWrite = useRef(true);
  useEffect(() => {
    if (firstWrite.current) {
      firstWrite.current = false;
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota / mode privé */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
