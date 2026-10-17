"use client";

import { useState } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { can } from "@/src/lib/api";
import AssistantChat, { newChat } from "@/src/components/workshop/assistant/AssistantChat";
import AssistantSettings from "@/src/components/workshop/assistant/AssistantSettings";
import ModelPicker from "@/src/components/workshop/assistant/ModelPicker";
import { useAiSettings } from "@/src/components/workshop/assistant/useAiSettings";

const BODY = { mode: "site" };

// IAnaginosko : assistant du site (bêta, clé personnelle), avec les outils du corpus.
export default function IAnaginoskoView() {
  const { user, ready } = useAuth();
  const { settings, error, reload, choose } = useAiSettings();
  const [chat] = useState(newChat);
  const [setup, setSetup] = useState(false);

  if (!ready) return null;
  if (!can(user, "ai")) return <p className="py-20 text-center text-base-content/60">Réservé aux comptes de la bêta.</p>;

  const keys = settings?.keys ?? [];
  const showSetup = setup || (settings !== null && !keys.length);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16 pt-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">IAnaginosko</h1>
        <span className="badge badge-sm badge-outline">Bêta</span>
        {keys.length > 0 && (
          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:max-w-md">
            <div className="min-w-0 flex-1">
              <ModelPicker keys={keys} value={settings?.draft ?? null} onChange={(p) => choose("draft", p)} />
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSetup(!setup)} aria-expanded={showSetup}>
              Clés
            </button>
          </div>
        )}
      </header>
      {error && <p className="text-sm text-error">{error}</p>}

      {showSetup && (
        <section className="rounded-box border border-base-300 p-5">
          <AssistantSettings onChanged={reload} />
        </section>
      )}

      {keys.length > 0 && <AssistantChat chat={chat} body={BODY} placeholder="Une question sur un texte, un mot, une traduction" roomy />}
    </div>
  );
}
