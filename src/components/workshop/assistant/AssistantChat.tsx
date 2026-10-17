"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Chat, useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { chatEndpoint, chatHeaders, updateRule, type Target } from "@/src/lib/aiApi";

const TOOL_LABEL: Record<string, string> = {
  lire_chapitre: "Lit le chapitre",
  fiche_lemme: "Consulte la fiche",
  occurrences: "Cherche les occurrences",
  glossaire: "Consulte le glossaire",
  charte: "Consulte la charte",
  proposer_regle: "Propose une règle",
  rechercher_etudes: "Cherche des études",
  web_search: "Recherche sur le web",
  web_fetch: "Lit une page",
};

// Mise en forme minimale des réponses : gras, italique, code, liens, listes.
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\(https?:[^)\s]+\))/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={m.index}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) out.push(<code key={m.index}>{t.slice(1, -1)}</code>);
    else if (t.startsWith("[")) {
      const [, label, href] = t.match(/\[([^\]]+)\]\(([^)]+)\)/)!;
      out.push(
        <a key={m.index} href={href} target="_blank" rel="noreferrer" className="link">
          {label}
        </a>,
      );
    } else out.push(<em key={m.index}>{t.slice(1, -1)}</em>);
    last = m.index! + t.length;
  }
  out.push(text.slice(last));
  return out;
}

function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      {text.split(/\n{2,}/).map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*([-*]|\d+\.)\s/.test(l)))
          return (
            <ul key={i} className="list-disc space-y-0.5 pl-4">
              {lines.map((l, k) => (
                <li key={k}>{inline(l.replace(/^\s*([-*]|\d+\.)\s/, ""))}</li>
              ))}
            </ul>
          );
        return (
          <p key={i} className="whitespace-pre-wrap">
            {inline(block.replace(/^#+\s*/, ""))}
          </p>
        );
      })}
    </div>
  );
}

type Part = UIMessage["parts"][number];

function ProposedRule({ output }: { output: unknown }) {
  const [done, setDone] = useState(false);
  const id = Number(String(output).match(/R(\d+)/)?.[1]);
  if (!id) return null;
  return (
    <button
      type="button"
      className="btn btn-outline btn-xs mt-1"
      disabled={done}
      onClick={() => updateRule(id, { status: "active" }).then(() => setDone(true))}
    >
      {done ? `R${id} validée` : `Valider R${id}`}
    </button>
  );
}

function PartView({ part }: { part: Part }) {
  if (part.type === "text") return <Markdown text={part.text} />;
  if (part.type === "source-url")
    return (
      <a href={part.url} target="_blank" rel="noreferrer" className="link block truncate text-xs text-base-content/60">
        {part.title || part.url}
      </a>
    );
  if (!part.type.startsWith("tool-")) return null;
  const tool = part as Part & { state: string; input?: Record<string, unknown>; output?: unknown; errorText?: string };
  const name = part.type.slice(5);
  const arg = tool.input?.lemma ?? tool.input?.query ?? (tool.input?.book ? `${tool.input.book} ${tool.input.chapter ?? ""}` : "");
  return (
    <div className="text-xs text-base-content/50">
      {TOOL_LABEL[name] ?? name}
      {arg ? <span className="font-greek"> {String(arg)}</span> : null}
      {tool.state === "output-error" && <span className="text-error"> · échec</span>}
      {name === "proposer_regle" && tool.state === "output-available" && <ProposedRule output={tool.output} />}
    </div>
  );
}

// Une conversation par chapitre, conservée quand on change d'onglet ou de verset.
export const newChat = () => new Chat({ transport: new DefaultChatTransport({ api: chatEndpoint(), headers: chatHeaders }) });

// Chat de l'atelier : le contexte (verset et texte en cours) part avec chaque message.
export default function AssistantChat({ chat, target, text }: { chat: Chat<UIMessage>; target: Target; text: string }) {
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
    sendMessage({ text: q }, { body: { context: { ...target, text } } });
  };

  return (
    <div className="flex flex-col gap-3">
      {messages.length > 0 && (
        <div className="space-y-4 text-sm leading-relaxed">
          {messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "ml-6 rounded-box bg-base-200 px-3 py-2" : ""}>
              <div className="space-y-1.5">
                {m.parts.map((p, i) => (
                  <PartView key={i} part={p} />
                ))}
              </div>
            </div>
          ))}
          {status === "submitted" && <span className="loading loading-dots loading-sm text-base-content/40" />}
          <div ref={end} />
        </div>
      )}
      {error && <p className="text-sm text-error">{error.message}</p>}
      <div className="rounded-box border border-base-300 focus-within:border-base-content/40">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          placeholder={`Question sur ${target.chapter}:${target.verse}`}
          className="block w-full resize-none bg-transparent px-3 py-2 text-sm outline-none"
        />
        <div className="flex items-center justify-between px-2 pb-2">
          {messages.length > 0 ? (
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setMessages([])} disabled={busy}>
              Effacer
            </button>
          ) : (
            <span />
          )}
          {busy ? (
            <button type="button" className="btn btn-ghost btn-xs" onClick={stop}>
              Arrêter
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-xs" onClick={send} disabled={!input.trim()}>
              Envoyer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
