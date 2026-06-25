"use client";

import { useEffect, useRef, useState } from "react";
import { accentLabel, breathingLabel, type GraphemeInfo } from "../lib/greek";
import type { SheetStage } from "./SheetContext";
import type { WordContext } from "../lib/tokenize";
import { glossFor } from "../data/glosses";
import { ntGlossFor } from "../data/nt";
import { playTranslit, playUrl } from "../lib/audio";
import { useHasAudio } from "../hooks/useHasAudio";
import { useAuth } from "../hooks/useAuth";
import {
  fetchPronunciations,
  createPronunciation,
  deletePronunciation,
  type PronunciationOverride,
  type System,
} from "../lib/api";
import { translitToIpa } from "../lib/translitIpa";
import Translit from "./Translit";

const anyGloss = (lemma: string | null) => (lemma ? glossFor(lemma) ?? ntGlossFor(lemma) : undefined);

// Ligne de prononciation. Si le son est disponible, toute la ligne est cliquable
// (grande cible tactile) avec l'icône haut-parleur ; sinon, simple texte (le
// bouton son est masqué tant que l'audio n'est pas généré).
function SpeakRow({
  label,
  value,
  override,
  canEdit,
  onEdit,
  bump,
}: {
  label: string;
  value: string;
  override?: PronunciationOverride;
  canEdit?: boolean;
  onEdit?: () => void;
  bump?: number;
}) {
  const hasAudio = useHasAudio(value) || !!override;
  // ?v= force le rechargement après une régénération (cache court côté API).
  const play = () => (override ? playUrl(`${override.audioUrl}?v=${bump ?? 0}`) : playTranslit(value));
  // Enveloppe dans un span NON-flex : sinon les morceaux du Translit (dont la
  // voyelle accentuée isolée) deviennent des enfants du flex et reçoivent le
  // gap-1.5 de chaque côté → faux espaces autour des lettres rouges.
  const content = (
    <span className="min-w-0">
      <span className="text-sm text-base-content/55">{label}&nbsp;</span>
      <Translit value={value} stressedClass="text-accent" />
    </span>
  );

  return (
    <div className="-mx-2 flex items-center gap-0.5 rounded-lg px-2 transition-colors hover:bg-base-200">
      {hasAudio ? (
        <button onClick={play} aria-label={`Écouter (${label})`} className="flex flex-1 items-center gap-1.5 py-2 text-left">
          {content}
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="ml-auto shrink-0 text-accent">
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
            <path d="M16.5 8.5a4 4 0 010 7M19 6a7 7 0 010 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      ) : (
        <div className="flex flex-1 items-center gap-1.5 py-2">{content}</div>
      )}
      {canEdit && (
        <button
          onClick={onEdit}
          aria-label="Ajuster la prononciation"
          className="btn btn-ghost btn-xs btn-circle shrink-0 text-base-content/45"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Éditeur d'override (admin/philologue) : écriture phonétique IPA -> régénère Azure.
function PronunciationEditor({
  system,
  translit,
  ipa,
  hasOverride,
  busy,
  error,
  onTranslitChange,
  onIpaChange,
  onSave,
  onDelete,
  onCancel,
}: {
  system: System;
  translit: string;
  ipa: string;
  hasOverride: boolean;
  busy: boolean;
  error: string | null;
  onTranslitChange: (v: string) => void;
  onIpaChange: (v: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-2 rounded-box border border-base-300 bg-base-200/60 p-3">
      <div className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/55">
        Prononciation {system === "erasmien" ? "érasmienne" : "restituée"}
      </div>
      <label className="mt-2 block text-xs text-base-content/55">
        Transcription (latin, MAJUSCULE = syllabe accentuée)
      </label>
      <input
        value={translit}
        onChange={(e) => onTranslitChange(e.target.value)}
        spellCheck={false}
        className="input input-sm mt-1 w-full"
        aria-label="Transcription en caractères latins"
      />
      <label className="mt-2 block text-xs text-base-content/55">Phonème (IPA)</label>
      <input
        value={ipa}
        onChange={(e) => onIpaChange(e.target.value)}
        spellCheck={false}
        className="input input-sm mt-1 w-full font-mono"
        aria-label="Écriture phonétique (IPA)"
      />
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={busy || !ipa.trim() || !translit.trim()}
          className="btn btn-primary btn-sm flex-1"
        >
          {busy ? "Génération…" : "Régénérer"}
        </button>
        {hasOverride && (
          <button onClick={onDelete} disabled={busy} className="btn btn-ghost btn-sm text-error">
            Réinitialiser
          </button>
        )}
        <button onClick={onCancel} disabled={busy} className="btn btn-ghost btn-sm">
          Annuler
        </button>
      </div>
    </div>
  );
}

function Pron({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-box bg-base-200 px-3 py-2.5">
      <div className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/55">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-medium">{value}</div>
    </div>
  );
}

export default function LetterSheet({
  info,
  word,
  stage,
  textRef,
  wordIndex,
  onClose,
}: {
  info: GraphemeInfo;
  word: WordContext | null;
  stage: SheetStage;
  textRef: string | null;
  wordIndex: number;
  onClose: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const letter = info.letter;

  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "philologist";

  // Overrides de prononciation pour ce texte (chargés une fois par ref).
  const [overrides, setOverrides] = useState<PronunciationOverride[]>([]);
  const [bump, setBump] = useState(0);
  const [editing, setEditing] = useState<{ system: System; translit: string; ipa: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = () =>
    fetchPronunciations()
      .then((rows) => {
        setOverrides(rows);
        setBump((b) => b + 1);
      })
      .catch(() => {});

  // Liste globale (les overrides s'appliquent par forme, à toutes les occurrences).
  useEffect(() => {
    fetchPronunciations().then(setOverrides).catch(() => {});
  }, []);

  // Changer de mot ferme l'éditeur en cours.
  useEffect(() => {
    setEditing(null);
    setError(null);
  }, [wordIndex]);

  const overrideFor = (system: System) =>
    word ? overrides.find((o) => o.grec === word.grec && o.system === system) : undefined;

  const openEditor = (system: System, value: string) => {
    setError(null);
    const ov = overrideFor(system);
    const translit = ov?.translit ?? value;
    setEditing({ system, translit, ipa: ov?.ipa ?? translitToIpa(translit, system) });
  };

  const saveEditor = async () => {
    if (!editing || !textRef || !word) return;
    setBusy(true);
    setError(null);
    try {
      await createPronunciation({
        ref: textRef,
        wordIndex,
        system: editing.system,
        grec: word.grec,
        ipa: editing.ipa.trim(),
        translit: editing.translit.trim(),
      });
      await reload();
      setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const deleteEditor = async () => {
    if (!editing) return;
    const ov = overrideFor(editing.system);
    if (!ov) {
      setEditing(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deletePronunciation(ov.id);
      await reload();
      setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  // Feuille non bloquante : les lettres restent cliquables (pour enchaîner les
  // clics). On ferme via Échap ou un clic en dehors, sauf sur une lettre, qui
  // pilote elle-même le cycle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (boxRef.current?.contains(t)) return;
      if (t.closest(".glyph")) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onClose]);

  if (!letter) return null;

  const chips = [
    breathingLabel(info.breathing),
    accentLabel(info.accent),
    info.iotaSubscript ? "Iota souscrit" : null,
    info.isFinalSigma ? "Sigma final (ς)" : null,
  ].filter((c): c is string => c !== null);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center wide:inset-x-auto wide:right-4 wide:bottom-4 wide:block">
      <div
        ref={boxRef}
        role="dialog"
        aria-label={`Lettre ${letter.name}`}
        className="animate-sheet pointer-events-auto max-h-[85dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-base-300 bg-base-100 px-5 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl wide:max-h-[calc(100dvh-30rem)] wide:w-80 wide:rounded-2xl wide:pb-5"
      >
        <div className="flex items-center gap-4">
          <div className="font-greek flex h-16 w-16 shrink-0 items-center justify-center rounded-box bg-accent/15 text-4xl text-accent">
            {info.cluster}
          </div>
          <div className="min-w-0">
            <div className="text-xl font-semibold">{letter.name}</div>
            <div className="font-greek text-base text-base-content/60">
              {letter.upper} {letter.lower}
              {letter.final ? ` ${letter.final}` : ""}
              <span className="font-sans"> · « {letter.latin} »</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="btn btn-ghost btn-circle ml-auto shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-4 flex gap-2.5">
          <Pron label="Érasmien" value={letter.erasmien} />
          <Pron label="Restituée" value={letter.restituee} />
        </div>

        {letter.note && (
          <p className="mt-3 text-sm leading-relaxed text-base-content/70">{letter.note}</p>
        )}

        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <span key={c} className="badge badge-sm badge-ghost">
                {c}
              </span>
            ))}
          </div>
        )}

        {stage === 1 && word && (
          <p className="mt-4 border-t border-base-300 pt-3 text-sm text-base-content/55">
            Touchez encore la lettre pour voir le mot complet →
          </p>
        )}

        {stage === 2 && word && (
          <div className="mt-4 border-t border-base-300 pt-4">
            <div className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/55">
              Le mot
            </div>
            <div className="font-greek mt-1 text-2xl">{word.grec}</div>
            <div className="mt-2 text-base">
              <SpeakRow
                label="Érasmien"
                value={overrideFor("erasmien")?.translit ?? word.erasmien}
                override={overrideFor("erasmien")}
                canEdit={canEdit && !!textRef}
                onEdit={() => openEditor("erasmien", word.erasmien)}
                bump={bump}
              />
              {editing?.system === "erasmien" && (
                <PronunciationEditor
                  system="erasmien"
                  translit={editing.translit}
                  ipa={editing.ipa}
                  hasOverride={!!overrideFor("erasmien")}
                  busy={busy}
                  error={error}
                  onTranslitChange={(v) =>
                    setEditing((s) => (s ? { ...s, translit: v, ipa: translitToIpa(v, "erasmien") } : s))
                  }
                  onIpaChange={(v) => setEditing((s) => (s ? { ...s, ipa: v } : s))}
                  onSave={saveEditor}
                  onDelete={deleteEditor}
                  onCancel={() => setEditing(null)}
                />
              )}
              {word.restituee && (
                <>
                  <SpeakRow
                    label="Restituée"
                    value={overrideFor("restituee")?.translit ?? word.restituee}
                    override={overrideFor("restituee")}
                    canEdit={canEdit && !!textRef}
                    onEdit={() => openEditor("restituee", word.restituee!)}
                    bump={bump}
                  />
                  {editing?.system === "restituee" && (
                    <PronunciationEditor
                      system="restituee"
                      translit={editing.translit}
                      ipa={editing.ipa}
                      hasOverride={!!overrideFor("restituee")}
                      busy={busy}
                      error={error}
                      onTranslitChange={(v) =>
                        setEditing((s) => (s ? { ...s, translit: v, ipa: translitToIpa(v, "restituee") } : s))
                      }
                      onIpaChange={(v) => setEditing((s) => (s ? { ...s, ipa: v } : s))}
                      onSave={saveEditor}
                      onDelete={deleteEditor}
                      onCancel={() => setEditing(null)}
                    />
                  )}
                </>
              )}
            </div>
            {word.morph && (
              <div className="mt-3 rounded-box bg-base-200 px-3 py-2">
                <div className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/55">
                  Analyse
                </div>
                <div className="mt-0.5 text-sm">
                  <span className="font-medium">{word.nature}</span>
                  <span className="text-base-content/70"> · {word.morph}</span>
                </div>
              </div>
            )}
            {word.lemme && (
              <div className="mt-3">
                <div className="text-sm">
                  <span className="text-base-content/55">Lemme&nbsp;</span>
                  <span className="font-greek font-medium">{word.lemme}</span>
                  {!word.morph && word.nature ? (
                    <span className="text-base-content/55"> · {word.nature}</span>
                  ) : null}
                </div>
                {anyGloss(word.lemme) && (
                  <p className="mt-1 text-sm leading-snug text-base-content/70">
                    {anyGloss(word.lemme)!.excerpt}
                    <span className="text-base-content/45"> · Bailly</span>
                  </p>
                )}
                <a
                  href={`/concordance/${encodeURIComponent(word.lemme)}`}
                  className="mt-1.5 inline-block text-sm font-medium text-accent"
                >
                  définition complète & occurrences →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
