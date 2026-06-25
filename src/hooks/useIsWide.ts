import { useEffect, useState } from "react";

// Vrai sur les grands écrans (breakpoint « wide » = 86rem, comme les contrôles
// flottants). Sert à basculer le popover d'annotation en bottom-sheet sur mobile.
const QUERY = "(min-width: 86rem)";

export function useIsWide(): boolean {
  const [wide, setWide] = useState(
    () => typeof matchMedia !== "undefined" && matchMedia(QUERY).matches,
  );
  useEffect(() => {
    const mq = matchMedia(QUERY);
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}
