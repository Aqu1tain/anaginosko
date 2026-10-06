"use client";

import { useEffect, useState } from "react";
import { playTranslit, playUrl } from "../../lib/audio";
import { useHasAudio } from "../../hooks/useHasAudio";
import {
  fetchPronunciations,
  createPronunciation,
  deletePronunciation,
  type PronunciationOverride,
  type System,
} from "../../lib/api";
import { translitToIpa } from "../../lib/translitIpa";
import Translit from "../Translit";
import type { WordContext } from "../../lib/tokenize";

// Ligne de prononciation. Si le son est disponible, toute la ligne est cliquable
// (grande cible tactile) avec l'icône haut-parleur ; sinon, simple texte (le
// bouton son est masqué tant que l'audio n'est pas généré).
export function SpeakRow({
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
      <span className="text-sm text-base-content/70">{label}&nbsp;</span>
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
          className="btn btn-ghost btn-xs btn-circle shrink-0 text-base-content/70"
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
export function PronunciationEditor({
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
      <div className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/70">
        Prononciation {system === "erasmien" ? "érasmienne" : "restituée"}
      </div>
      <label className="mt-2 block text-xs text-base-content/70">
        Transcription (latin, MAJUSCULE = syllabe accentuée)
      </label>
      <input
        value={translit}
        onChange={(e) => onTranslitChange(e.target.value)}
        spellCheck={false}
        className="input input-sm mt-1 w-full"
        aria-label="Transcription en caractères latins"
      />
      <label className="mt-2 block text-xs text-base-content/70">Phonème (IPA)</label>
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

// Prononciations érasmienne et restituée d'un mot, avec l'éditeur d'override
// réservé aux éditeurs. Les overrides valent par forme, pour toutes ses occurrences.
export function WordPronunciation({
  word,
  textRef,
  wordIndex,
  canEdit,
}: {
  word: WordContext;
  textRef: string | null;
  wordIndex: number;
  canEdit: boolean;
}) {
  const [overrides, setOverrides] = useState<PronunciationOverride[]>([]);
  const [bump, setBump] = useState(0);
  const [editing, setEditing] = useState<{ system: System; translit: string; ipa: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPronunciations().then(setOverrides).catch(() => {});
  }, []);

  useEffect(() => {
    setEditing(null);
    setError(null);
  }, [wordIndex]);

  const reload = () =>
    fetchPronunciations()
      .then((rows) => {
        setOverrides(rows);
        setBump((b) => b + 1);
      })
      .catch(() => {});

  const overrideFor = (system: System) => overrides.find((o) => o.grec === word.grec && o.system === system);

  const openEditor = (system: System, value: string) => {
    setError(null);
    const ov = overrideFor(system);
    const translit = ov?.translit ?? value;
    setEditing({ system, translit, ipa: ov?.ipa ?? translitToIpa(translit, system) });
  };

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await reload();
      setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const save = () => {
    if (!editing || !textRef) return;
    run(() =>
      createPronunciation({
        ref: textRef,
        wordIndex,
        system: editing.system,
        grec: word.grec,
        ipa: editing.ipa.trim(),
        translit: editing.translit.trim(),
      }),
    );
  };

  const remove = () => {
    const ov = editing && overrideFor(editing.system);
    if (!ov) return setEditing(null);
    run(() => deletePronunciation(ov.id));
  };

  const systems: { system: System; label: string; value: string | null }[] = [
    { system: "erasmien", label: "Érasmienne", value: word.erasmien },
    { system: "restituee", label: "Restituée", value: word.restituee },
  ];

  return (
    <div>
      {systems.map(({ system, label, value }) =>
        value ? (
          <div key={system}>
            <SpeakRow
              label={label}
              value={overrideFor(system)?.translit ?? value}
              override={overrideFor(system)}
              canEdit={canEdit && !!textRef}
              onEdit={() => openEditor(system, value)}
              bump={bump}
            />
            {editing?.system === system && (
              <PronunciationEditor
                system={system}
                translit={editing.translit}
                ipa={editing.ipa}
                hasOverride={!!overrideFor(system)}
                busy={busy}
                error={error}
                onTranslitChange={(v) => setEditing((s) => (s ? { ...s, translit: v, ipa: translitToIpa(v, system) } : s))}
                onIpaChange={(v) => setEditing((s) => (s ? { ...s, ipa: v } : s))}
                onSave={save}
                onDelete={remove}
                onCancel={() => setEditing(null)}
              />
            )}
          </div>
        ) : null,
      )}
    </div>
  );
}
