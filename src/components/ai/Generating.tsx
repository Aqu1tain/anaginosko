"use client";

import type { UIMessage } from "ai";

// Indicateur visible tant que l'assistant travaille : ce qu'il fait en ce moment.
export default function Generating({ messages }: { messages: UIMessage[] }) {
  const last = messages.at(-1);
  const part = last?.role === "assistant" ? last.parts.at(-1) : undefined;
  const label = !part
    ? "Réflexion"
    : part.type.startsWith("tool-") && "state" in part && part.state !== "output-available"
      ? "Consultation du corpus"
      : part.type === "text"
        ? "Rédaction"
        : "Réflexion";
  return (
    <div className="flex items-center gap-2 text-sm text-base-content/55" role="status" aria-live="polite">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/50" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
      </span>
      {label}…
    </div>
  );
}
