"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { createAnnotation, updateAnnotation, type Annotation } from "../lib/api";
import { trackEvent } from "../lib/analytics";

export type AnnotationTarget = {
  ref: string;
  verse: number | null;
  wordIndex: number | null;
  endWordIndex: number | null;
  graphemeIndex: number | null;
  grec: string;
  scopeLabel: string;
  existing?: Annotation;
};

function normalizeUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export default function AnnotationEditor({
  target,
  onClose,
  onSaved,
  title,
  bodyLabel = "Note",
  bodyPlaceholder = "Note philologique, neutre et factuelle…",
}: {
  target: AnnotationTarget;
  onClose: () => void;
  onSaved: () => void;
  /** Titre du modal (défaut : « Annoter » / « Modifier l’annotation »). */
  title?: string;
  bodyLabel?: string;
  bodyPlaceholder?: string;
}) {
  const editing = !!target.existing;
  const [body, setBody] = useState(target.existing?.body ?? "");
  const [source, setSource] = useState(target.existing?.source ?? "");
  const [link, setLink] = useState(target.existing?.link ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkUrl = link.trim() ? normalizeUrl(link) : null;
  const linkValid = link.trim() === "" || linkUrl != null;
  // Le contrat API exige une source pour toute annotation, définitions incluses.
  const valid = body.trim().length > 0 && source.trim().length > 0 && linkValid;
  const heading = title ?? (editing ? "Modifier l’annotation" : "Annoter");

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    const input = {
      ref: target.ref,
      verse: target.verse,
      wordIndex: target.wordIndex,
      endWordIndex: target.endWordIndex,
      graphemeIndex: target.graphemeIndex,
      body: body.trim(),
      source: source.trim(),
      link: linkUrl,
    };
    try {
      if (editing) await updateAnnotation(target.existing!.id, input);
      else {
        await createAnnotation(input);
        trackEvent("Annotation", "create", target.ref);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label={heading}
        className="relative w-full max-w-lg rounded-t-3xl border border-base-300 bg-base-100 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-5"
      >
        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-base-content/70">
          <span className="badge badge-sm badge-primary badge-soft capitalize">{target.scopeLabel}</span>
          <span className="font-mono">{target.ref}</span>
          {target.verse != null && <span>v. {target.verse}</span>}
        </div>
        <h2 className="text-lg font-semibold">{heading}</h2>
        {target.grec && <p className="mt-1 font-greek text-xl leading-snug text-primary">{target.grec}</p>}

        <label className="mt-4 block">
          <span className="text-sm font-medium">{bodyLabel}</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            autoFocus
            placeholder={bodyPlaceholder}
            className="textarea textarea-bordered mt-1 w-full"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-sm font-medium">
            Source <span className="text-error">*</span>
          </span>
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="ex. Bailly s.v. λόγος ; BDAG λόγος 2"
            className="input input-bordered mt-1 w-full"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-sm font-medium">
            Lien <span className="font-normal text-base-content/70">(optionnel)</span>
          </span>
          <input
            type="url"
            inputMode="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://bailly.app/λόγος"
            className={`input input-bordered mt-1 w-full ${link && !linkUrl ? "input-error" : ""}`}
          />
          {link && !linkUrl && (
            <span className="mt-1 block text-xs text-error">URL invalide (https://…).</span>
          )}
        </label>

        {error && <p className="mt-3 text-sm text-error">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            Annuler
          </button>
          <button onClick={save} disabled={!valid || saving} className="btn btn-primary btn-sm">
            {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Publier"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
