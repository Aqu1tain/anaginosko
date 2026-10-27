"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import type { KeyInfo, ModelPick } from "@/src/lib/aiApi";
import { newChat } from "@/src/components/workshop/assistant/AssistantChat";
import ModelPicker from "@/src/components/workshop/assistant/ModelPicker";
import MessageView from "@/src/components/ai/MessageView";
import Composer from "@/src/components/ai/Composer";
import Generating from "@/src/components/ai/Generating";
import { useStickToBottom } from "@/src/components/ai/useStickToBottom";

const SUGGESTIONS = [
  "Quels sens prend ἔλεος dans la Septante ?",
  "Compare ἀγαπάω et φιλέω en Jean 21,15-17",
  "Analyse la syntaxe de Jean 1,1",
  "Où la Septante emploie-t-elle λόγος pour la parole de Dieu ?",
];

const textOf = (m: UIMessage) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");

function Actions({ message, last, onRegenerate }: { message: UIMessage; last: boolean; onRegenerate: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 flex gap-1 text-xs text-base-content/70">
      <button
        type="button"
        className="rounded-md px-2 py-1 hover:bg-base-200 hover:text-base-content"
        onClick={() => {
          navigator.clipboard?.writeText(textOf(message));
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "Copié" : "Copier"}
      </button>
      {last && (
        <button type="button" className="rounded-md px-2 py-1 hover:bg-base-200 hover:text-base-content" onClick={onRegenerate}>
          Régénérer
        </button>
      )}
    </div>
  );
}

// Une conversation IAnaginosko : accueil tant qu'elle est vide, puis fil et saisie en bas.
export default function Conversation({
  id,
  initial,
  keys,
  pick,
  onPick,
  onStarted,
  onFinished,
}: {
  id: string;
  initial: UIMessage[];
  keys: KeyInfo[];
  pick: ModelPick | null;
  onPick: (p: ModelPick) => void;
  onStarted: (id: string) => void;
  onFinished: () => void;
}) {
  const [chat] = useState(() => newChat({ id, messages: initial, body: { mode: "site" }, onFinish: onFinished }));
  const { messages, sendMessage, status, error, stop, regenerate } = useChat({ chat });
  const [input, setInput] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  const { follow, jump } = useStickToBottom(end);

  useEffect(() => {
    if (busy) follow();
  }, [messages, busy, follow]);

  const send = (text = input) => {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    if (!messages.length) onStarted(id);
    sendMessage({ text: q });
    requestAnimationFrame(jump);
  };

  const picker = keys.length > 0 && <ModelPicker pill keys={keys} value={pick} onChange={onPick} />;
  const composer = (
    <Composer value={input} onChange={setInput} onSend={() => send()} onStop={stop} busy={busy} placeholder="Une question sur un texte, un mot, une traduction" tools={picker} autoFocus />
  );

  if (!messages.length)
    return (
      <div className="flex min-h-[60dvh] flex-col justify-center gap-6 py-10">
        <h2 className="text-center text-3xl font-semibold tracking-tight">Que voulez-vous étudier ?</h2>
        {composer}
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-base-300 px-3.5 py-1.5 text-sm text-base-content/80 hover:bg-base-200 hover:text-base-content">
              {s}
            </button>
          ))}
        </div>
      </div>
    );

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col">
      <div className="flex-1 space-y-8 pt-6 pb-8 text-[0.97rem] leading-relaxed">
        {messages.map((m) => (
          <div key={m.id}>
            <MessageView message={m} />
            {m.role === "assistant" && !(busy && m.id === lastAssistant?.id) && (
              <Actions message={m} last={m.id === lastAssistant?.id} onRegenerate={() => regenerate()} />
            )}
          </div>
        ))}
        {busy && <Generating messages={messages} />}
        {error && (
          <div className="rounded-box border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
            {error.message}{" "}
            <button type="button" className="link" onClick={() => regenerate()}>
              Réessayer
            </button>
          </div>
        )}
        <div ref={end} className="scroll-mb-48" />
      </div>
      <div className="sticky bottom-0 bg-gradient-to-t from-base-100 from-70% to-transparent pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] wide:pb-6">{composer}</div>
    </div>
  );
}
