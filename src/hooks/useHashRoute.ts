import { useEffect, useState } from "react";

export type Route =
  | { name: "library" }
  | { name: "text"; id: string }
  | { name: "alphabet" }
  | { name: "concordance"; lemma: string | null };

function parse(hash: string): Route {
  const path = hash.replace(/^#/, "");
  if (path.startsWith("/text/")) return { name: "text", id: path.slice("/text/".length) };
  if (path === "/alphabet") return { name: "alphabet" };
  if (path.startsWith("/concordance/"))
    return { name: "concordance", lemma: decodeURIComponent(path.slice("/concordance/".length)) };
  if (path === "/concordance") return { name: "concordance", lemma: null };
  return { name: "library" };
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(location.hash));

  useEffect(() => {
    let prev = parse(location.hash);
    let lastListScroll = 0;
    const onChange = () => {
      if (prev.name === "library") lastListScroll = window.scrollY;
      const next = parse(location.hash);
      setRoute(next);
      // Restaure la position de la liste au retour, sinon repart du haut.
      window.scrollTo(0, next.name === "library" ? lastListScroll : 0);
      prev = next;
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}
