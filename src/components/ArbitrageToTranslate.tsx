"use client";

import { useEffect, useState } from "react";
import { arb, arbErrors } from "./ArbitrageBiblion";

type Item = { book: string; label: string; ref: string; kind: "prouvé" | "probable"; reason: string };

// Onglet « À traduire » : les versets qui appellent une traduction maison. Un clic
// ouvre le chapitre centré sur le verset.
export function ToTranslateList({ onOpen }: { onOpen: (book: string, ch: number, focus: string) => void }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { arb<{ items: Item[] }>("/a-traduire").then((d) => setItems(d.items)).catch((e) => setErr(arbErrors(e).join(" "))); }, []);
  if (err) return <div className="alert alert-error mt-6 text-sm">{err}</div>;
  if (!items) return <p className="mt-6 text-sm text-base-content/60">Chargement…</p>;
  if (!items.length) return <p className="mt-6 text-sm text-success">Rien à traduire pour l'instant.</p>;
  const proven = items.filter((i) => i.kind === "prouvé").length;
  return (
    <div className="mt-4">
      <p className="text-sm text-base-content/70">
        <span className="font-semibold text-primary">{proven}</span> omissions prouvées de Giguet, puis {items.length - proven} versets probables où le français est nettement plus court que le grec. Un verset traduit maison ou marqué « c'est bon » disparaît de la liste.
      </p>
      <div className="mt-3 grid gap-1">
        {items.map((i) => (
          <button key={`${i.book}:${i.ref}`} type="button" onClick={() => onOpen(i.book, Number(i.ref.split(":")[0]), i.ref)}
            className="flex flex-wrap items-center gap-2 rounded-box border border-base-200 bg-base-100 px-3 py-2 text-left text-sm hover:border-primary/40">
            <span className={`badge badge-xs ${i.kind === "prouvé" ? "badge-error" : "badge-warning"}`}>{i.kind}</span>
            <span className="font-medium">{i.label} {i.ref}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-base-content/55">{i.reason}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
