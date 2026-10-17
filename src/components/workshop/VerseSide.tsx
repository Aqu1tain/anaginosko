"use client";

import { useEffect, useState } from "react";
import { addComment, fetchHistory, resolveComment, type Comment, type WorkCorpus } from "@/src/lib/workshopApi";

// Différence mot à mot entre une version et le texte actuel (plus longue sous-suite commune).
function diff(from: string, to: string): { word: string; kind: "same" | "del" | "add" }[] {
  const a = from.split(/\s+/).filter(Boolean);
  const b = to.split(/\s+/).filter(Boolean);
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: { word: string; kind: "same" | "del" | "add" }[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      out.push({ word: a[i++], kind: "same" });
      j++;
    } else if (j < b.length && (i >= a.length || dp[i][j + 1] >= dp[i + 1][j])) out.push({ word: b[j++], kind: "add" });
    else out.push({ word: a[i++], kind: "del" });
  }
  return out;
}

const when = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Discussion et versions publiées du verset actif.
export default function VerseSide({
  corpus,
  book,
  verseRef,
  comments,
  current,
  onChanged,
  onRestore,
}: {
  corpus: WorkCorpus;
  book: string;
  verseRef: string;
  comments: Comment[];
  current: string;
  onChanged: () => void;
  onRestore: (text: string) => void;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ text: string | null; by: string; at: string }[] | null>(null);

  useEffect(() => {
    let alive = true;
    setHistory(null);
    fetchHistory(corpus, book, verseRef)
      .then((h) => alive && setHistory(h))
      .catch(() => alive && setHistory([]));
    return () => {
      alive = false;
    };
  }, [corpus, book, verseRef]);

  const post = async () => {
    if (!body.trim()) return;
    setBusy(true);
    await addComment(corpus, book, verseRef, body.trim()).catch(() => {});
    setBody("");
    setBusy(false);
    onChanged();
  };

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/50">Discussion · {verseRef}</h3>
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className={`rounded-md border border-base-300 p-2 text-sm ${c.resolved ? "opacity-50" : ""}`}>
              <p className="flex items-baseline justify-between gap-2 text-xs text-base-content/55">
                <span className="font-medium text-base-content/80">{c.author}</span>
                <button type="button" className="hover:text-primary" onClick={() => resolveComment(c.id, !c.resolved).then(onChanged)}>
                  {c.resolved ? "Rouvrir" : "Résolu"}
                </button>
              </p>
              <p className="mt-0.5 whitespace-pre-wrap">{c.body}</p>
              <p className="mt-0.5 text-[0.7rem] text-base-content/40">{when(c.at)}</p>
            </li>
          ))}
        </ul>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) post();
          }}
          rows={2}
          placeholder="Commenter ce verset"
          className="textarea textarea-bordered mt-2 w-full text-sm"
        />
        <button type="button" onClick={post} disabled={busy || !body.trim()} className="btn btn-outline btn-xs">
          Publier
        </button>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/50">Versions publiées</h3>
        <p className="mb-2 text-xs text-base-content/45">Comparées au texte actuel : <span className="bg-error/15 line-through">retiré</span> <span className="bg-success/20">ajouté</span></p>
        {history === null ? (
          <p className="text-sm text-base-content/45">Chargement…</p>
        ) : history.length ? (
          <ul className="space-y-2">
            {history.map((h, i) => (
              <li key={`${h.at}-${i}`} className="text-sm">
                <p className="text-xs text-base-content/50">
                  {h.by} · {when(h.at)}
                </p>
                {h.text && current && h.text !== current ? (
                  <p>
                    {diff(h.text, current).map((d, k) => (
                      <span key={k} className={d.kind === "del" ? "bg-error/15 line-through" : d.kind === "add" ? "bg-success/20" : ""}>
                        {d.word}{" "}
                      </span>
                    ))}
                  </p>
                ) : (
                  <p className={h.text ? "" : "italic text-base-content/50"}>{h.text ?? "Retour à la traduction de base"}</p>
                )}
                {h.text && i > 0 && (
                  <button type="button" onClick={() => onRestore(h.text!)} className="text-xs text-primary hover:underline">
                    Reprendre cette version
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-base-content/45">Jamais publié.</p>
        )}
      </section>
    </div>
  );
}
