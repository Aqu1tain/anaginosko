"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { createReport, type ReportCategory } from "../lib/api";

export type ReportTarget = {
  ref: string | null;
  verse: number | null;
  wordIndex: number | null;
  endWordIndex: number | null;
  graphemeIndex: number | null;
  annotationId: number | null;
  grec?: string;
  scopeLabel: string;
  // Catégories proposées selon le point d'entrée ; la première est présélectionnée.
  categories: ReportCategory[];
};

export const CATEGORY_LABEL: Record<ReportCategory, string> = {
  traduction: "Erreur de traduction",
  texte: "Problème sur le texte grec",
  commentaire: "Commentaire à revoir",
  definition: "Définition à corriger",
  demande_note: "Demander l’ajout d’une note",
};

const emailValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export default function ReportEditor({
  target,
  onClose,
}: {
  target: ReportTarget;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<ReportCategory>(target.categories[0]);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const valid = message.trim().length > 0 && emailValid(email);

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await createReport({
        category,
        email: email.trim(),
        message: message.trim(),
        ref: target.ref,
        verse: target.verse,
        wordIndex: target.wordIndex,
        endWordIndex: target.endWordIndex,
        graphemeIndex: target.graphemeIndex,
        annotationId: category === "commentaire" ? target.annotationId : null,
        website,
      });
      setDone(true);
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
        aria-label="Signaler"
        className="relative w-full max-w-lg rounded-t-3xl border border-base-300 bg-base-100 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-5"
      >
        {done ? (
          <div className="text-center">
            <h2 className="text-lg font-semibold">Merci !</h2>
            <p className="mt-2 text-sm text-base-content/80">
              Un e-mail de confirmation vous a été envoyé. Cliquez sur le lien qu’il contient pour
              valider votre signalement.
            </p>
            <button onClick={onClose} className="btn btn-primary btn-sm mt-5">
              Fermer
            </button>
          </div>
        ) : (
          <>
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-base-content/70">
              <span className="badge badge-sm badge-primary badge-soft capitalize">
                {target.scopeLabel}
              </span>
              {target.ref && <span className="font-mono">{target.ref}</span>}
              {target.verse != null && <span>v. {target.verse}</span>}
            </div>
            <h2 className="text-lg font-semibold">Signaler</h2>
            {target.grec && (
              <p className="mt-1 font-greek text-xl leading-snug text-primary">{target.grec}</p>
            )}

            {target.categories.length > 1 && (
              <label className="mt-4 block">
                <span className="text-sm font-medium">Motif</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ReportCategory)}
                  className="select select-bordered mt-1 w-full"
                >
                  {target.categories.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="mt-3 block">
              <span className="text-sm font-medium">
                Votre message <span className="text-error">*</span>
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                autoFocus
                placeholder="Décrivez l’erreur ou la demande, aussi précisément que possible…"
                className="textarea textarea-bordered mt-1 w-full"
              />
            </label>

            <label className="mt-3 block">
              <span className="text-sm font-medium">
                Votre e-mail <span className="text-error">*</span>
              </span>
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.fr"
                className={`input input-bordered mt-1 w-full ${email && !emailValid(email) ? "input-error" : ""}`}
              />
              <span className="mt-1 block text-xs text-base-content/60">
                Sert uniquement à vérifier et suivre ce signalement. Transmis à notre prestataire
                d’envoi d’e-mails ; détails dans la{" "}
                <a className="link" href="/confidentialite" target="_blank" rel="noreferrer">
                  politique de confidentialité
                </a>.
              </span>
            </label>

            {/* Honeypot anti-robot : invisible, laissé vide par un humain. */}
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />

            {error && <p className="mt-3 text-sm text-error">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} className="btn btn-ghost btn-sm">
                Annuler
              </button>
              <button onClick={save} disabled={!valid || saving} className="btn btn-primary btn-sm">
                {saving ? "Envoi…" : "Envoyer"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
