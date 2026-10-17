"use client";

import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Liens vers le site : navigation interne, quelle que soit l'origine écrite par le modèle.
const internal = (href: string) => href.match(/^https?:\/\/(?:next\.)?anaginosko\.fr(\/[^\s]*)?$/)?.[1] ?? null;

const COMPONENTS: Components = {
  h1: ({ children }) => <h3 className="mt-5 mb-2 text-lg font-semibold">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-5 mb-2 text-base font-semibold">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-4 mb-1.5 font-semibold">{children}</h4>,
  p: ({ children }) => <p className="my-2.5 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2.5 list-disc space-y-1 pl-5 marker:text-base-content/40">{children}</ul>,
  ol: ({ children }) => <ol className="my-2.5 list-decimal space-y-1 pl-5 marker:text-base-content/50">{children}</ol>,
  blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-primary/40 pl-3 text-base-content/75">{children}</blockquote>,
  code: ({ children }) => <code className="rounded bg-base-200 px-1 py-0.5 text-[0.85em]">{children}</code>,
  pre: ({ children }) => <pre className="my-3 overflow-x-auto rounded-box bg-base-200 p-3 text-sm">{children}</pre>,
  hr: () => <hr className="my-4 border-base-300" />,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-box border border-base-300">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b border-base-300 bg-base-200/60 px-3 py-1.5 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-base-300/60 px-3 py-1.5 align-top">{children}</td>,
  a: ({ href = "", children }) => {
    const path = internal(href);
    if (path !== null)
      return (
        <Link href={path || "/"} className="link link-primary">
          {children}
        </Link>
      );
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className="link link-primary">
        {children}
      </a>
    );
  },
};

export default function Markdown({ text }: { text: string }) {
  return (
    <div className="break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
