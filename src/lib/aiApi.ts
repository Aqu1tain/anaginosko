import { apiFetch, apiUrl, getToken } from "./api";
import type { WorkCorpus } from "./workshopApi";

// Client de l'assistant IA (BYOK) et de la charte de traduction.

export const PROVIDERS = [
  { id: "anthropic", label: "Anthropic" },
  { id: "openai", label: "OpenAI" },
  { id: "google", label: "Google Gemini" },
  { id: "mistral", label: "Mistral" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "compatible", label: "Compatible OpenAI" },
] as const;
export type ProviderId = (typeof PROVIDERS)[number]["id"];

export type Credentials = {
  configured: boolean;
  provider: ProviderId | null;
  baseUrl: string | null;
  modelAnalysis: string | null;
  modelDraft: string | null;
  keyHint: string | null;
  defaults: Partial<Record<ProviderId, { analysis: string; draft: string }>>;
};

export type CredentialsInput = { provider: ProviderId; apiKey?: string; baseUrl?: string; modelAnalysis: string; modelDraft: string };
export type Usage = { models: { model: string; runs: number; input: number; output: number; cached: number }[] };

export const fetchCredentials = () => apiFetch<Credentials>("/ai/credentials");
export const saveCredentials = (input: CredentialsInput) => apiFetch<Credentials>("/ai/credentials", { method: "PUT", body: JSON.stringify(input) });
export const deleteCredentials = () => apiFetch<Credentials>("/ai/credentials", { method: "DELETE" });
export const fetchUsage = () => apiFetch<Usage>("/ai/usage");

export type Level = "lexical" | "exegetical" | "theological" | "style";
export const LEVEL_LABEL: Record<Level, string> = { lexical: "lexical", exegetical: "exégétique", theological: "théologique", style: "style" };

export type Proposal = {
  reference: string;
  words: { i: number; grec: string; lemme: string; morph?: string }[];
  analysis: {
    words: { i: number; role: string; sense: string; alternatives: string[] }[];
    structure: string;
    decisions: { words: number[]; question: string; options: string[]; leaning: string; level: Level }[];
  };
  draft: {
    translation: string;
    alignment: { words: number[]; french: string }[];
    omitted: { i: number; reason: string }[];
    decisions: { about: string; choice: string; reason: string; level: Level; source: string }[];
  };
  review: { verdict: "ok" | "revise"; issues: { severity: "major" | "minor"; kind: string; message: string }[] };
  revised: boolean;
  missing: number[];
  rulesUsed: { id: number; text: string }[];
  terms: { lemma: string; renderings: string[] }[];
  usage: { input: number; output: number; cached: number };
};

export type Step = "dossier" | "analyse" | "jet" | "couverture" | "relecture" | "correction";
export type DraftEvent =
  | { type: "step"; step: Step; status: "start" | "done"; detail?: string }
  | { type: "result"; result: Proposal }
  | { type: "error"; message: string }
  | { type: "ping" };

export type Target = { corpus: WorkCorpus; book: string; chapter: number; verse: number };

const authHeaders = (): Record<string, string> => {
  const token = getToken();
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};
export const chatEndpoint = () => apiUrl("/ai/chat");
export const chatHeaders = authHeaders;

// Premier jet d'un verset : lit les événements (une ligne JSON chacun) au fil de l'eau.
export async function streamDraft(target: Target, onEvent: (e: DraftEvent) => void, signal?: AbortSignal) {
  const res = await fetch(apiUrl("/ai/draft"), { method: "POST", headers: authHeaders(), body: JSON.stringify(target), signal });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Erreur ${res.status}`);
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) onEvent(JSON.parse(line));
  }
}

export type Rule = {
  id: number;
  kind: "rule" | "style";
  corpus: WorkCorpus | null;
  book: string | null;
  lemma: string | null;
  text: string;
  examples: string | null;
  status: "active" | "proposed";
  author: string;
  updatedAt: string;
};
export type RuleInput = Pick<Rule, "kind" | "corpus" | "book" | "lemma" | "text" | "examples">;

export const fetchRules = () => apiFetch<{ rules: Rule[] }>("/workshop/rules").then((d) => d.rules);
export const createRule = (input: RuleInput) => apiFetch<Rule>("/workshop/rules", { method: "POST", body: JSON.stringify(input) });
export const updateRule = (id: number, patch: Partial<RuleInput & { status: Rule["status"] }>) =>
  apiFetch<Rule>(`/workshop/rules/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
export const deleteRule = (id: number) => apiFetch(`/workshop/rules/${id}`, { method: "DELETE" });
