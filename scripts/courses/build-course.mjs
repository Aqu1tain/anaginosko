// Compile un cours rédigé en Markdown (content/cours/<slug>/) en un paquet JSON
// importable depuis l'administration des cours (data/cours/<slug>.json). Chaque leçon
// devient un article brouillon au format BlockNote, puis suit la relecture habituelle.
//
// Syntaxe : ## et ### pour les titres, paragraphes, listes « - » et « 1. », citations
// « > », tableaux « | a | b | » (première ligne = en-tête), **gras**, *italique*,
// [lien](url), et « ::verset nt jn 1 1-3 » pour citer des versets du site.
//
//   node scripts/courses/build-course.mjs introduction-grec-biblique
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = path.resolve(new URL("../..", import.meta.url).pathname);

function inline(text) {
  const out = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\)/g;
  let last = 0;
  let m;
  const push = (t, styles = {}) => t && out.push({ type: "text", text: t, styles });
  while ((m = re.exec(text))) {
    push(text.slice(last, m.index));
    if (m[1] !== undefined) push(m[1], { bold: true });
    else if (m[2] !== undefined) push(m[2], { italic: true });
    else out.push({ type: "link", href: m[4], content: [{ type: "text", text: m[3], styles: {} }] });
    last = re.lastIndex;
  }
  push(text.slice(last));
  return out;
}

// Identifiants stables d'une compilation à l'autre (diffs Git lisibles).
let seed = "";
let counter = 0;
const nextId = () => createHash("sha1").update(`${seed}:${counter++}`).digest("hex").slice(0, 24);
const block = (type, content, props = {}) => ({ id: nextId(), type, props, content, children: [] });

function verse(spec) {
  const [corpus, book, chapter, range] = spec.trim().split(/\s+/);
  const [start, end] = range.split("-").map(Number);
  return block("verseQuote", undefined, {
    corpus,
    book,
    chapter: Number(chapter),
    verseStart: start,
    verseEnd: end ?? start,
    showFrench: true,
  });
}

function table(lines) {
  const rows = lines
    .filter((l) => !/^\|\s*-+/.test(l))
    .map((l) => ({ cells: l.replace(/^\||\|$/g, "").split("|").map((c) => inline(c.trim())) }));
  return { id: nextId(), type: "table", props: {}, content: { type: "tableContent", headerRows: 1, rows }, children: [] };
}

export function markdownToBlocks(md) {
  const lines = md.split("\n");
  const blocks = [];
  let para = [];
  const flush = () => {
    if (para.length) blocks.push(block("paragraph", inline(para.join(" "))));
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    if (!line.trim()) { flush(); continue; }
    let m;
    if ((m = line.match(/^(#{2,3})\s+(.*)$/))) { flush(); blocks.push(block("heading", inline(m[2]), { level: m[1].length })); continue; }
    if ((m = line.match(/^::verset\s+(.*)$/))) { flush(); blocks.push(verse(m[1])); continue; }
    if ((m = line.match(/^-\s+(.*)$/))) { flush(); blocks.push(block("bulletListItem", inline(m[1]))); continue; }
    if ((m = line.match(/^\d+\.\s+(.*)$/))) { flush(); blocks.push(block("numberedListItem", inline(m[1]))); continue; }
    if ((m = line.match(/^>\s?(.*)$/))) { flush(); blocks.push(block("quote", inline(m[1]))); continue; }
    if (line.startsWith("|")) {
      flush();
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(lines[i++].trim());
      i--;
      blocks.push(table(rows));
      continue;
    }
    para.push(line.trim());
  }
  flush();
  return blocks;
}

function frontMatter(source) {
  const m = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error("En-tête --- manquant");
  const meta = Object.fromEntries(m[1].split("\n").map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]));
  return { meta, body: m[2] };
}

function build(slug) {
  const dir = path.join(root, "content", "cours", slug);
  const course = JSON.parse(readFileSync(path.join(dir, "course.json"), "utf8"));
  const parts = course.parts.map((part) => ({
    title: part.title,
    lessons: part.lessons.map((file) => {
      const { meta, body } = frontMatter(readFileSync(path.join(dir, file), "utf8"));
      seed = `${slug}/${file}`;
      counter = 0;
      if (!meta.title) throw new Error(`${file} : titre manquant`);
      return { key: file.replace(/\.md$/, ""), title: meta.title, excerpt: meta.excerpt ?? "", content: markdownToBlocks(body) };
    }),
  }));
  const out = path.join(root, "data", "cours");
  if (!existsSync(out)) mkdirSync(out, { recursive: true });
  const bundle = { slug, title: course.title, summary: course.summary, level: course.level, parts };
  writeFileSync(path.join(out, `${slug}.json`), JSON.stringify(bundle));
  const n = parts.reduce((k, p) => k + p.lessons.length, 0);
  console.log(`${slug} : ${parts.length} parties, ${n} leçons -> data/cours/${slug}.json`);
}

const slug = process.argv[2];
if (slug) build(slug);
