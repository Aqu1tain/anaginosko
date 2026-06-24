import { useEffect, useState } from "react";

export type Route =
  | { name: "library" }
  | { name: "text"; id: string; highlight: number | null }
  | { name: "ntToc" }
  | { name: "ntBook"; book: string }
  | { name: "ntChapter"; book: string; chapter: number; highlight: number | null }
  | { name: "alphabet" }
  | { name: "concordance"; lemma: string | null }
  | { name: "mentions" };

function parse(hash: string): Route {
  const path = hash.replace(/^#/, "");
  if (path.startsWith("/text/")) {
    const [id, query] = path.slice("/text/".length).split("?");
    const m = query?.match(/(?:^|&)w=(\d+)/);
    return { name: "text", id, highlight: m ? Number(m[1]) : null };
  }
  if (path.startsWith("/nt/")) {
    const [rest, query] = path.slice("/nt/".length).split("?");
    const [book, chapterStr] = rest.split("/");
    if (book && chapterStr) {
      const m = query?.match(/(?:^|&)w=(\d+)/);
      return { name: "ntChapter", book, chapter: Number(chapterStr), highlight: m ? Number(m[1]) : null };
    }
    if (book) return { name: "ntBook", book };
  }
  if (path === "/nt") return { name: "ntToc" };
  if (path === "/alphabet") return { name: "alphabet" };
  if (path.startsWith("/concordance/"))
    return { name: "concordance", lemma: decodeURIComponent(path.slice("/concordance/".length)) };
  if (path === "/concordance") return { name: "concordance", lemma: null };
  if (path === "/mentions") return { name: "mentions" };
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
