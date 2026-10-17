"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { streamDraft, type Proposal, type Target } from "@/src/lib/aiApi";
import type { WorkCorpus } from "@/src/lib/workshopApi";
import DraftProposal, { Progress, type StepState } from "./DraftProposal";
import type { Chat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import AssistantChat from "./AssistantChat";
import ModelPicker from "./ModelPicker";
import { useAiSettings } from "./useAiSettings";

type DraftState = { steps: StepState; result?: Proposal; error?: string; running: boolean };

// Propositions de l'assistant, verset par verset, gardées le temps de la session du chapitre.
export function useVerseDrafts(corpus: WorkCorpus, book: string, chapter: number) {
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const controllers = useRef<Record<string, AbortController>>({});

  useEffect(() => {
    const all = controllers.current;
    return () => Object.values(all).forEach((c) => c.abort());
  }, []);

  const run = useCallback(
    async (verse: number) => {
      const ref = `${chapter}:${verse}`;
      controllers.current[ref]?.abort();
      const controller = new AbortController();
      controllers.current[ref] = controller;
      const patch = (fn: (s: DraftState) => DraftState) => setDrafts((d) => ({ ...d, [ref]: fn(d[ref] ?? { steps: {}, running: true }) }));
      setDrafts((d) => ({ ...d, [ref]: { steps: {}, running: true } }));
      try {
        await streamDraft(
          { corpus, book, chapter, verse },
          (e) => {
            if (e.type === "step") patch((s) => ({ ...s, steps: { ...s.steps, [e.step]: { status: e.status, detail: e.detail } } }));
            else if (e.type === "result") patch((s) => ({ ...s, result: e.result }));
            else if (e.type === "error") patch((s) => ({ ...s, error: e.message }));
          },
          controller.signal,
        );
      } catch (e) {
        if (!controller.signal.aborted) patch((s) => ({ ...s, error: (e as Error).message }));
      }
      patch((s) => ({ ...s, running: false }));
    },
    [corpus, book, chapter],
  );

  return { drafts, run };
}

export default function AssistantPanel({
  chat,
  target,
  current,
  state,
  onRun,
  onUse,
}: {
  chat: Chat<UIMessage>;
  target: Target;
  current: string;
  state: DraftState | undefined;
  onRun: () => void;
  onUse: (text: string) => void;
}) {
  const { settings, error, choose } = useAiSettings();

  if (settings && !settings.keys.length)
    return (
      <p className="text-sm text-base-content/60">
        Ajoutez une clé d’API dans{" "}
        <Link href={`?corpus=${target.corpus}&tab=assistant`} className="link">
          Assistant
        </Link>
        .
      </p>
    );

  return (
    <div className="space-y-5">
      {settings && (
        <section className="space-y-2 text-xs text-base-content/55">
          <div>
            <p className="mb-1">Analyse</p>
            <ModelPicker keys={settings.keys} value={settings.analysis} onChange={(p) => choose("analysis", p)} />
          </div>
          <div>
            <p className="mb-1">Rédaction et chat</p>
            <ModelPicker keys={settings.keys} value={settings.draft} onChange={(p) => choose("draft", p)} />
          </div>
          {error && <p className="text-error">{error}</p>}
        </section>
      )}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Verset {target.verse}</h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={onRun} disabled={state?.running} title="⌘ I">
            {state?.running ? "En cours…" : state?.result ? "Relancer" : "Proposer un jet"}
          </button>
        </div>
        {state && (state.running || !state.result) && <Progress steps={state.steps} />}
        {state?.error && <p className="text-sm text-error">{state.error}</p>}
        {state?.result && <DraftProposal proposal={state.result} current={current} onUse={onUse} />}
      </section>
      <section className="border-t border-base-300 pt-4">
        <h2 className="mb-2 text-sm font-semibold">Discussion</h2>
        <AssistantChat chat={chat} body={{ context: { ...target, text: current } }} placeholder={`Question sur ${target.chapter}:${target.verse}`} />
      </section>
    </div>
  );
}
