"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

const scrollParent = (el: HTMLElement | null): HTMLElement | null => {
  for (let p = el?.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    if (overflowY === "auto" || overflowY === "scroll") return p;
  }
  return null;
};

// Suit le bas de la conversation tant que la personne y est ; si elle remonte
// pendant la génération, on ne la ramène plus de force.
export function useStickToBottom(end: RefObject<HTMLElement | null>) {
  const stuck = useRef(true);

  useEffect(() => {
    const onScroll = () => {
      if (!end.current) return;
      const box = scrollParent(end.current);
      const gap = box ? box.scrollHeight - box.scrollTop - box.clientHeight : document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      stuck.current = gap < 160;
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, { capture: true });
  }, [end]);

  const follow = useCallback(() => {
    if (stuck.current) end.current?.scrollIntoView({ block: "end" });
  }, [end]);

  const jump = useCallback(() => {
    stuck.current = true;
    end.current?.scrollIntoView({ block: "end" });
  }, [end]);

  return { follow, jump };
}
