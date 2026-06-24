import { useState } from "react";
import { createAnnotation } from "../lib/api";

export type AnnotationTarget = {
  ref: string;
  wordIndex: number;
  graphemeIndex: number;
  verse: number | null;
  grec: string;
};

export default function AnnotationEditor({
  target,
  onClose,
  onSaved,
}: {
  target: AnnotationTarget;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [body, setBody] = useState("");
  const [source, setSource] = useState("");
  const [charOnly, setCharOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = body.trim().length > 0 && source.trim().length > 0;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await createAnnotation({
        ref: target.ref,
        verse: target.verse,
        wordIndex: target.wordIndex,
        graphemeIndex: charOnly ? target.graphemeIndex : null,
        body: body.trim(),
        source: source.trim(),
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label="Ajouter une annotation"
        className="relative w-full max-w-lg rounded-t-2xl border border-base-300 bg-base-100 p-5 shadow-2xl sm:rounded-2xl"
      >
        <h2 className="text-lg font-semibold">Annoter</h2>
        <p className="mt-1 text-sm text-base-content/70">
          <span className="font-greek text-lg">{target.grec}</span>
          {target.verse != null ? <span className="text-base-content/55"> · v. {target.verse}</span> : null}
        </p>

        <label className="mt-3 block">
          <span className="text-sm font-medium">Note</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Note philologique, neutre et factuelle…"
            className="textarea textarea-bordered mt-1 w-full"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-sm font-medium">
            Source <span className="text-accent">*</span>
          </span>
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="ex. Bailly s.v. λόγος ; BDAG ; Blass-Debrunner §…"
            className="input input-bordered mt-1 w-full"
          />
          <span className="mt-1 block text-xs text-base-content/55">
            Toute note doit être sourcée et neutre.
          </span>
        </label>

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={charOnly}
            onChange={(e) => setCharOnly(e.target.checked)}
            className="checkbox checkbox-sm"
          />
          <span>Annoter seulement ce caractère</span>
        </label>

        {error && <p className="mt-3 text-sm text-error">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            Annuler
          </button>
          <button onClick={save} disabled={!valid || saving} className="btn btn-primary btn-sm">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
