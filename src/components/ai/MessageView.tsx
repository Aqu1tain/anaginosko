"use client";

import { useState } from "react";
import type { UIMessage } from "ai";
import { updateRule } from "@/src/lib/aiApi";
import Markdown from "./Markdown";

type Part = UIMessage["parts"][number];
type ToolPart = Part & { type: `tool-${string}`; state: string; input?: Record<string, unknown>; output?: unknown; errorText?: string };

const TOOL_LABEL: Record<string, string> = {
  lire_chapitre: "Lecture du chapitre",
  lire_page: "Lecture de la page",
  fiche_lemme: "Fiche du lemme",
  occurrences: "Occurrences",
  glossaire: "Glossaire",
  charte: "Charte de traduction",
  proposer_regle: "Règle proposée",
  rechercher_etudes: "Recherche d’études",
  web_search: "Recherche sur le web",
  web_fetch: "Lecture d’une page web",
};

const isTool = (p: Part): p is ToolPart => p.type.startsWith("tool-");

function toolArg(p: ToolPart) {
  const i = p.input ?? {};
  if (i.lemma) return String(i.lemma);
  if (i.query) return `« ${String(i.query)} »`;
  if (i.path) return String(i.path);
  if (i.url) return String(i.url).replace(/^https?:\/\//, "");
  if (i.book) return `${String(i.book)} ${String(i.chapter ?? "")}`.trim();
  return "";
}

const preview = (output: unknown) => {
  const text = typeof output === "string" ? output : JSON.stringify(output, null, 1);
  return text.length > 1200 ? `${text.slice(0, 1200)}…` : text;
};

function ProposedRule({ output }: { output: unknown }) {
  const [done, setDone] = useState(false);
  const id = Number(String(output).match(/R(\d+)/)?.[1]);
  if (!id) return null;
  return (
    <button type="button" className="btn btn-outline btn-xs" disabled={done} onClick={() => updateRule(id, { status: "active" }).then(() => setDone(true))}>
      {done ? `R${id} validée` : `Valider R${id}`}
    </button>
  );
}

function StatusIcon({ state }: { state: string }) {
  if (state === "output-available") return <span className="text-success">✓</span>;
  if (state === "output-error") return <span className="text-error">!</span>;
  return <span className="loading loading-spinner loading-xs text-base-content/40" />;
}

// Étapes de recherche (appels d'outils), repliées en une ligne, dépliables.
function Steps({ tools }: { tools: ToolPart[] }) {
  const [open, setOpen] = useState(false);
  const running = tools.some((t) => t.state !== "output-available" && t.state !== "output-error");
  const last = tools.at(-1)!;
  return (
    <div className="my-2 rounded-box border border-base-300 text-sm">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-base-content/70 hover:text-base-content" aria-expanded={open}>
        <StatusIcon state={running ? "running" : "output-available"} />
        <span className="min-w-0 flex-1 truncate">
          {running ? (
            <>
              {TOOL_LABEL[last.type.slice(5)] ?? last.type.slice(5)} <span className="font-greek">{toolArg(last)}</span>
            </>
          ) : (
            `${tools.length} étape${tools.length > 1 ? "s" : ""} de recherche`
          )}
        </span>
        <span aria-hidden className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open && (
        <ol className="space-y-2 border-t border-base-300 px-3 py-2">
          {tools.map((t, i) => (
            <li key={i}>
              <div className="flex items-center gap-2">
                <StatusIcon state={t.state} />
                <span className="font-medium">{TOOL_LABEL[t.type.slice(5)] ?? t.type.slice(5)}</span>
                <span className="truncate font-greek text-base-content/70">{toolArg(t)}</span>
              </div>
              {t.state === "output-available" && t.output !== undefined && (
                <pre className="mt-1 ml-6 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-base-200/70 p-2 text-xs text-base-content/70">{preview(t.output)}</pre>
              )}
              {t.state === "output-error" && <p className="mt-1 ml-6 text-xs text-error">{t.errorText}</p>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Sources({ sources }: { sources: { url: string; title?: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {sources.map((s, i) => (
        <a
          key={s.url}
          href={s.url}
          target="_blank"
          rel="noreferrer noopener"
          className="flex max-w-56 items-center gap-2 rounded-box border border-base-300 px-2.5 py-1.5 text-xs hover:bg-base-200"
        >
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-base-200 text-[0.65rem] font-semibold">{i + 1}</span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{s.title || new URL(s.url).hostname}</span>
            <span className="block truncate text-base-content/50">{new URL(s.url).hostname.replace(/^www\./, "")}</span>
          </span>
        </a>
      ))}
    </div>
  );
}

function Reasoning({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (!text.trim()) return null;
  return (
    <div className="my-2 text-sm">
      <button type="button" onClick={() => setOpen(!open)} className="text-base-content/50 hover:text-base-content" aria-expanded={open}>
        Réflexion {open ? "▴" : "▾"}
      </button>
      {open && <p className="mt-1 whitespace-pre-wrap border-l-2 border-base-300 pl-3 text-base-content/70">{text}</p>}
    </div>
  );
}

// Groupe les appels d'outils consécutifs en un seul bloc d'étapes.
function blocks(parts: Part[]) {
  const out: ({ kind: "tools"; tools: ToolPart[] } | { kind: "part"; part: Part })[] = [];
  for (const p of parts) {
    if (isTool(p)) {
      const prev = out.at(-1);
      if (prev?.kind === "tools") prev.tools.push(p);
      else out.push({ kind: "tools", tools: [p] });
    } else out.push({ kind: "part", part: p });
  }
  return out;
}

// Une réponse de l'assistant : texte, réflexion, étapes, sources et règle proposée.
export default function MessageView({ message }: { message: UIMessage }) {
  if (message.role === "user") {
    const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl bg-base-200 px-4 py-2.5">{text}</p>
      </div>
    );
  }
  const sources = message.parts.filter((p): p is Extract<Part, { type: "source-url" }> => p.type === "source-url");
  const rules = message.parts.filter((p): p is ToolPart => isTool(p) && p.type === "tool-proposer_regle" && p.state === "output-available");
  return (
    <div className="min-w-0">
      {blocks(message.parts).map((b, i) =>
        b.kind === "tools" ? (
          <Steps key={i} tools={b.tools} />
        ) : b.part.type === "text" ? (
          <Markdown key={i} text={b.part.text} />
        ) : b.part.type === "reasoning" ? (
          <Reasoning key={i} text={b.part.text} />
        ) : null,
      )}
      {rules.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {rules.map((r, i) => (
            <ProposedRule key={i} output={r.output} />
          ))}
        </div>
      )}
      {sources.length > 0 && <Sources sources={sources.map((s) => ({ url: s.url, title: s.title }))} />}
    </div>
  );
}
