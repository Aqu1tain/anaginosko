import { useCallback, useEffect, useRef, useState } from "react";

// « Safe triangle » / prediction cone : quand le curseur quitte le déclencheur en
// diagonale VERS le popup (placé dessous), on garde le popup ouvert tant que la
// trajectoire reste dans le triangle déclencheur→coins-hauts-du-popup. Sinon on
// ferme. Cf. mega-menus Amazon / macOS / Windows.

type Pt = { x: number; y: number };

const cross = (a: Pt, b: Pt, c: Pt) => (a.x - c.x) * (b.y - c.y) - (b.x - c.x) * (a.y - c.y);

function inTriangle(p: Pt, a: Pt, b: Pt, c: Pt): boolean {
  const d1 = cross(p, a, b);
  const d2 = cross(p, b, c);
  const d3 = cross(p, c, a);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

const over = (el: HTMLElement | null, p: Pt) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
};

// Seul répit : si le curseur s'immobilise DANS le cône (en route vers le popup),
// on attend ce court délai avant de fermer. Hors du cône = fermeture immédiate.
const GRACE = 120; // ms

export function useSafeHover() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const popRef = useRef<HTMLElement | null>(null);
  const apex = useRef<Pt | null>(null);
  const timer = useRef<number | null>(null);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const close = useCallback(() => {
    clearTimer();
    apex.current = null;
    setOpen(false);
  }, []);
  const show = useCallback(() => {
    clearTimer();
    setOpen(true);
  }, []);
  const scheduleClose = (delay: number) => {
    clearTimer();
    timer.current = window.setTimeout(close, delay);
  };

  useEffect(() => {
    if (!open) return;
    const onMove = (e: PointerEvent) => {
      const p = { x: e.clientX, y: e.clientY };
      if (over(triggerRef.current, p) || over(popRef.current, p)) {
        clearTimer();
        return;
      }
      const pop = popRef.current;
      if (pop && apex.current) {
        const r = pop.getBoundingClientRect();
        const headingToPop = inTriangle(p, apex.current, { x: r.left, y: r.top }, { x: r.right, y: r.top });
        if (headingToPop) {
          scheduleClose(GRACE); // file vers le popup : court répit, fermé s'il s'arrête
          return;
        }
      }
      close(); // hors du cône : fermeture immédiate
    };
    document.addEventListener("pointermove", onMove);
    return () => document.removeEventListener("pointermove", onMove);
  }, [open, close]);

  const triggerProps = {
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse") return; // tactile : géré au clic
      show();
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      apex.current = { x: e.clientX, y: e.clientY };
      scheduleClose(GRACE);
    },
  };
  const popProps = {
    onPointerEnter: () => clearTimer(),
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      close();
    },
  };

  return { open, setOpen, show, close, triggerRef, popRef, triggerProps, popProps };
}
