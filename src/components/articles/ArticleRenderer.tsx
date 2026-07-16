import { Fragment, type ReactNode } from "react";
import { loadChapterFs } from "@/lib/nt-server";
import { corpusById } from "@/src/data/corpus";
import VerseQuoteView from "./VerseQuoteView";
import ChapterRefLink from "./ChapterRefLink";
import EmbedView from "./EmbedView";
import { normalizeEmbedUrl } from "@/src/data/embed";
import type { VerseLine, VerseQuoteProps, ChapterRefProps } from "./citationTypes";

// Rendu public d'un article : mappe le JSON BlockNote vers du JSX serveur, sans
// dangerouslySetInnerHTML (XSS impossible par construction). N'embarque PAS l'éditeur.
// Les blocs inconnus sont ignorés (robustesse aux montées de version BlockNote).

type Styles = Record<string, unknown>;
type InlineItem = { type?: string; text?: string; styles?: Styles; href?: string; content?: unknown; props?: ChapterRefProps };

type Block = {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: Block[];
};

const safeHref = (href: string): string | null =>
  /^https?:\/\//i.test(href) || href.startsWith("/") || href.startsWith("#") ? href : null;

function renderStyledText(text: string, styles: Styles = {}, key: number): ReactNode {
  let node: ReactNode = text;
  if (styles.code) node = <code>{node}</code>;
  if (styles.bold) node = <strong>{node}</strong>;
  if (styles.italic) node = <em>{node}</em>;
  if (styles.underline) node = <u>{node}</u>;
  if (styles.strike) node = <s>{node}</s>;
  return <Fragment key={key}>{node}</Fragment>;
}

function renderInline(content: unknown): ReactNode {
  if (!Array.isArray(content)) return null;
  return (content as InlineItem[]).map((item, i) => {
    if (item.type === "text") return renderStyledText(item.text ?? "", item.styles, i);
    if (item.type === "link") {
      const href = safeHref(item.href ?? "");
      const inner = renderInline(item.content);
      return href ? (
        <a key={i} href={href} className="link link-primary" rel="noopener noreferrer">
          {inner}
        </a>
      ) : (
        <Fragment key={i}>{inner}</Fragment>
      );
    }
    if (item.type === "chapterRef" && item.props) {
      const p = item.props;
      return <ChapterRefLink key={i} corpus={p.corpus} book={p.book} chapter={p.chapter} form={p.form} />;
    }
    return null;
  });
}

async function VerseQuoteServer({ props }: { props: VerseQuoteProps }) {
  let verses: VerseLine[] = [];
  try {
    const text = await loadChapterFs(props.book, props.chapter, corpusById(props.corpus));
    const greekByV: Record<number, string[]> = {};
    for (const m of text.mots ?? []) {
      if (m.verse == null || m.verse < props.verseStart || m.verse > props.verseEnd) continue;
      (greekByV[m.verse] ??= []).push(m.grec);
    }
    for (let v = props.verseStart; v <= props.verseEnd; v += 1) {
      if (greekByV[v]) verses.push({ v, greek: greekByV[v].join(" "), french: text.francais?.[String(v)] ?? null });
    }
  } catch {
    verses = [];
  }
  return <VerseQuoteView {...props} verses={verses} linked />;
}

const headingTag = (level: unknown) => (level === 2 ? "h3" : level === 3 ? "h4" : "h2");

function renderBlock(block: Block): ReactNode {
  const key = block.id;
  switch (block.type) {
    case "paragraph":
      return (
        <p key={key} className="my-3 leading-relaxed">
          {renderInline(block.content)}
        </p>
      );
    case "heading": {
      const Tag = headingTag(block.props?.level) as "h2" | "h3" | "h4";
      return (
        <Tag key={key} className="mt-8 mb-3 font-bold">
          {renderInline(block.content)}
        </Tag>
      );
    }
    case "quote":
      return (
        <blockquote key={key} className="my-4 border-l-4 border-base-300 pl-4 italic text-base-content/80">
          {renderInline(block.content)}
        </blockquote>
      );
    case "codeBlock":
      return (
        <pre key={key} className="my-4 overflow-x-auto rounded-lg bg-base-200 p-4 text-sm">
          <code>{renderInline(block.content)}</code>
        </pre>
      );
    case "divider":
      return <hr key={key} className="my-6 border-base-300" />;
    case "image": {
      const url = String(block.props?.url ?? "");
      if (!(url.startsWith("/articles/uploads/") || /^https:\/\//.test(url))) return null;
      const caption = block.props?.caption ? String(block.props.caption) : "";
      return (
        <figure key={key} className="my-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={caption} loading="lazy" decoding="async" className="mx-auto max-w-full rounded-lg" />
          {caption && <figcaption className="mt-1 text-center text-sm text-base-content/60">{caption}</figcaption>}
        </figure>
      );
    }
    case "verseQuote":
      return <VerseQuoteServer key={key} props={block.props as unknown as VerseQuoteProps} />;
    case "embed": {
      const src = normalizeEmbedUrl(String(block.props?.url ?? ""));
      return src ? <EmbedView key={key} src={src} title={block.props?.title ? String(block.props.title) : undefined} /> : null;
    }
    case "bulletListItem":
    case "numberedListItem":
    case "checkListItem":
      return (
        <li key={key}>
          {renderInline(block.content)}
          {block.children && block.children.length > 0 && renderBlocks(block.children)}
        </li>
      );
    default:
      return (
        <div key={key}>
          {renderInline(block.content)}
          {block.children && block.children.length > 0 && renderBlocks(block.children)}
        </div>
      );
  }
}

// Regroupe les puces consécutives en ul/ol ; les autres blocs sont rendus tels quels.
function renderBlocks(blocks: Block[]): ReactNode {
  const out: ReactNode[] = [];
  let run: Block[] = [];
  let runTag: "ul" | "ol" | null = null;

  const flush = () => {
    if (!run.length || !runTag) return;
    const Tag = runTag;
    out.push(
      <Tag key={`list-${run[0].id}`} className={runTag === "ol" ? "my-3 list-decimal pl-6" : "my-3 list-disc pl-6"}>
        {run.map(renderBlock)}
      </Tag>,
    );
    run = [];
    runTag = null;
  };

  for (const b of blocks) {
    const tag = b.type === "numberedListItem" ? "ol" : b.type === "bulletListItem" || b.type === "checkListItem" ? "ul" : null;
    if (tag) {
      if (runTag && runTag !== tag) flush();
      runTag = tag;
      run.push(b);
    } else {
      flush();
      out.push(renderBlock(b));
    }
  }
  flush();
  return out;
}

export default function ArticleRenderer({ content }: { content: unknown[] }) {
  if (!Array.isArray(content)) return null;
  return <div className="article-body">{renderBlocks(content as Block[])}</div>;
}
