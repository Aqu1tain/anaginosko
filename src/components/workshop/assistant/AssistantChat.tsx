"use client";

import { useEffect, useRef, useState } from "react";
import { Chat, useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { chatEndpoint, chatHeaders } from "@/src/lib/aiApi";
import MessageView from "@/src/components/ai/MessageView";
import Composer from "@/src/components/ai/Composer";

// Une conversation, conservée quand on change d'onglet ou de verset.
export const newChat = (init: { id?: string; messages?: UIMessage[]; body?: object; onFinish?: () => void } = {}) =>
  new Chat({
    id: init.id,
    messages: init.messages,
    onFinish: init.onFinish,
    transport: new DefaultChatTransport({ api: chatEndpoint(), headers: chatHeaders, body: init.body }),
  });

// Chat de l'atelier : `body` part avec chaque message (verset et texte en cours).
export default function AssistantChat({ chat, body, placeholder }: { chat: Chat<UIMessage>; body: object; placeholder: string }) {
  const { messages, sendMessage, status, error, stop, setMessages } = useChat({ chat });
  const [input, setInput] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  const send = () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    sendMessage({ text: q }, { body });
  };

  return (
    <div className="flex flex-col gap-3">
      {messages.length > 0 && (
        <div className="space-y-5 text-sm leading-relaxed">
          {messages.map((m) => (
            <MessageView key={m.id} message={m} />
          ))}
          {status === "submitted" && <span className="loading loading-dots loading-sm text-base-content/40" />}
          <div ref={end} />
        </div>
      )}
      {error && <p className="text-sm text-error">{error.message}</p>}
      <Composer
        value={input}
        onChange={setInput}
        onSend={send}
        onStop={stop}
        busy={busy}
        placeholder={placeholder}
        tools={
          messages.length > 0 && (
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setMessages([])} disabled={busy}>
              Effacer
            </button>
          )
        }
      />
    </div>
  );
}
