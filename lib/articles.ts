import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

// Stockage éditorial des articles, côté Next (pas d'API AdonisJS : la préprod tourne
// sur l'image API de prod). Un fichier JSON par article dans ARTICLES_DIR, écritures
// atomiques (tmp+rename). ARTICLES_DIR est PERSISTANT (hors bundle réécrit à chaque
// déploiement) ; en dev il retombe sur .articles/ à la racine (gitignoré).
//
// Concurrence : chaque mutation lit-modifie-écrit dans UNE fonction synchrone, sans
// await interne. Node étant mono-thread, aucune autre exécution JS ne s'intercale :
// la séquence est atomique. Le compteur `rev` détecte en plus les sauvegardes sur une
// version périmée (deux onglets de l'auteur) et répond 409.

export type ArticleCategory = "site" | "philologie";
export type ArticleStatus = "draft" | "in_review" | "changes_requested" | "published" | "archived";
export type ArticleSignature = "author" | "collective";
export type TransitionAction = "submit" | "request_changes" | "approve" | "unpublish" | "archive" | "restore";

export type ArticleAuthor = { userId: number; name: string; role: string };

export type ArticleComment = {
  id: string;
  author: ArticleAuthor;
  blockId: string | null;
  text: string;
  createdAt: string;
  resolved: boolean;
};

export type ArticleEvent = {
  at: string;
  by: string;
  type: "created" | "submitted" | "changes_requested" | "approved" | "unpublished" | "archived" | "restored";
  note?: string;
};

export type Article = {
  schemaVersion: number;
  id: string;
  rev: number;
  slug: string;
  category: ArticleCategory;
  title: string;
  excerpt: string;
  cover: string | null;
  status: ArticleStatus;
  author: ArticleAuthor;
  signature: ArticleSignature;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  content: unknown[];
  comments: ArticleComment[];
  events: ArticleEvent[];
};

export type ArticleSummary = Omit<Article, "content" | "comments" | "events"> & {
  commentsCount: number;
  unresolvedComments: number;
};

export const SCHEMA_VERSION = 1;
const MAX_CONTENT_BYTES = 1_000_000;
const MAX_COMMENT = 10_000;
const MAX_TITLE = 200;
const MAX_EXCERPT = 500;
const MAX_IMAGE_BYTES = 4_000_000;

const ARTICLES_DIR = process.env.ARTICLES_DIR || path.join(process.cwd(), ".articles");
const ARTICLES_SUB = path.join(ARTICLES_DIR, "articles");
const UPLOADS_SUB = path.join(ARTICLES_DIR, "uploads");

function ensureDirs() {
  fs.mkdirSync(ARTICLES_SUB, { recursive: true });
  fs.mkdirSync(UPLOADS_SUB, { recursive: true });
}

const articlePath = (id: string) => path.join(ARTICLES_SUB, `${id}.json`);

const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const now = () => new Date().toISOString();

export function slugify(title: string): string {
  const s = title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return s || "article";
}

// --- Lectures ---

function readArticle(id: string): Article | null {
  try {
    return JSON.parse(fs.readFileSync(articlePath(id), "utf8")) as Article;
  } catch {
    return null;
  }
}

export function getArticle(id: string): Article | null {
  if (!/^[a-z0-9-]+$/i.test(id)) return null;
  return readArticle(id);
}

function readAll(): Article[] {
  ensureDirs();
  const out: Article[] = [];
  for (const name of fs.readdirSync(ARTICLES_SUB)) {
    if (!name.endsWith(".json") || name.endsWith(".tmp")) continue;
    const a = readArticle(name.slice(0, -5));
    if (a) out.push(a);
  }
  return out;
}

const toSummary = (a: Article): ArticleSummary => {
  const { content: _c, comments, events: _e, ...rest } = a;
  void _c;
  void _e;
  return { ...rest, commentsCount: comments.length, unresolvedComments: comments.filter((c) => !c.resolved).length };
};

// Liste pour le tableau de bord : admin voit tout, philologue voit les siens.
export function listArticles(viewer: { id?: number; role?: string }): ArticleSummary[] {
  const all = readAll();
  const visible = viewer.role === "admin" ? all : all.filter((a) => a.author.userId === viewer.id);
  return visible.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).map(toSummary);
}

export function listPublished(): ArticleSummary[] {
  return readAll()
    .filter((a) => a.status === "published")
    .sort((a, b) => ((a.publishedAt ?? "") < (b.publishedAt ?? "") ? 1 : -1))
    .map(toSummary);
}

export function getPublishedBySlug(slug: string): Article | null {
  return readAll().find((a) => a.status === "published" && a.slug === slug) ?? null;
}

// --- Écritures ---

function writeArticle(a: Article) {
  ensureDirs();
  const p = articlePath(a.id);
  const tmp = p + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(a, null, 2));
  fs.renameSync(tmp, p);
}

const isAdmin = (auth: { role?: string }) => auth.role === "admin";
const isAuthor = (a: Article, auth: { id?: number }) => a.author.userId === auth.id;

export function createArticle(
  auth: { id?: number; role?: string; name?: string },
  input: { title: string; category: ArticleCategory; signature?: ArticleSignature },
): { ok: true; article: Article } | { ok: false; status: number; error: string } {
  const title = (input.title || "").trim();
  if (!title) return { ok: false, status: 400, error: "Titre requis." };
  if (title.length > MAX_TITLE) return { ok: false, status: 400, error: "Titre trop long." };
  if (input.category !== "site" && input.category !== "philologie")
    return { ok: false, status: 400, error: "Catégorie invalide." };
  if (input.category === "site" && !isAdmin(auth))
    return { ok: false, status: 403, error: "Catégorie « Site » réservée aux admins." };
  if (auth.id == null) return { ok: false, status: 401, error: "Non authentifié." };

  const ts = now();
  const article: Article = {
    schemaVersion: SCHEMA_VERSION,
    id: genId(),
    rev: 1,
    slug: slugify(title),
    category: input.category,
    title,
    excerpt: "",
    cover: null,
    status: "draft",
    author: { userId: auth.id, name: auth.name || "", role: auth.role || "" },
    signature: input.signature === "collective" ? "collective" : "author",
    createdAt: ts,
    updatedAt: ts,
    publishedAt: null,
    content: [],
    comments: [],
    events: [{ at: ts, by: auth.name || "", type: "created" }],
  };
  writeArticle(article);
  return { ok: true, article };
}

export type ArticlePatch = {
  rev: number;
  title?: string;
  excerpt?: string;
  cover?: string | null;
  signature?: ArticleSignature;
  content?: unknown[];
};

export function saveArticle(
  id: string,
  auth: { id?: number; role?: string },
  patch: ArticlePatch,
): { ok: true; article: Article } | { ok: false; status: number; error: string } {
  const a = getArticle(id);
  if (!a) return { ok: false, status: 404, error: "Article introuvable." };
  if (!isAdmin(auth) && !isAuthor(a, auth)) return { ok: false, status: 403, error: "Accès refusé." };
  if (a.status !== "draft" && a.status !== "changes_requested")
    return { ok: false, status: 409, error: "Article non modifiable dans cet état." };
  if (patch.rev !== a.rev) return { ok: false, status: 409, error: "Version périmée, rechargez l'article." };

  if (patch.title !== undefined) {
    const t = patch.title.trim();
    if (!t) return { ok: false, status: 400, error: "Titre requis." };
    if (t.length > MAX_TITLE) return { ok: false, status: 400, error: "Titre trop long." };
    a.title = t;
    if (!a.publishedAt) a.slug = slugify(t);
  }
  if (patch.excerpt !== undefined) {
    if (patch.excerpt.length > MAX_EXCERPT) return { ok: false, status: 400, error: "Résumé trop long." };
    a.excerpt = patch.excerpt.trim();
  }
  if (patch.cover !== undefined) {
    if (patch.cover !== null && !isUploadUrl(patch.cover)) return { ok: false, status: 400, error: "Couverture invalide." };
    a.cover = patch.cover;
  }
  if (patch.signature !== undefined) a.signature = patch.signature === "collective" ? "collective" : "author";
  if (patch.content !== undefined) {
    if (!Array.isArray(patch.content)) return { ok: false, status: 400, error: "Contenu invalide." };
    if (JSON.stringify(patch.content).length > MAX_CONTENT_BYTES)
      return { ok: false, status: 413, error: "Contenu trop volumineux." };
    a.content = patch.content;
  }
  a.rev += 1;
  a.updatedAt = now();
  writeArticle(a);
  return { ok: true, article: a };
}

export function deleteArticle(
  id: string,
  auth: { id?: number; role?: string },
): { ok: true } | { ok: false; status: number; error: string } {
  const a = getArticle(id);
  if (!a) return { ok: false, status: 404, error: "Article introuvable." };
  const allowed = isAdmin(auth) || (isAuthor(a, auth) && a.status === "draft");
  if (!allowed) return { ok: false, status: 403, error: "Suppression refusée." };
  fs.rmSync(articlePath(id), { force: true });
  fs.rmSync(path.join(UPLOADS_SUB, id), { recursive: true, force: true });
  return { ok: true };
}

// --- Machine à états de revue ---

type Rule = { from: ArticleStatus; to: ArticleStatus; adminOnly: boolean; event: ArticleEvent["type"] };
const TRANSITIONS: Record<TransitionAction, Rule[]> = {
  submit: [
    { from: "draft", to: "in_review", adminOnly: false, event: "submitted" },
    { from: "changes_requested", to: "in_review", adminOnly: false, event: "submitted" },
  ],
  request_changes: [{ from: "in_review", to: "changes_requested", adminOnly: true, event: "changes_requested" }],
  approve: [{ from: "in_review", to: "published", adminOnly: true, event: "approved" }],
  unpublish: [{ from: "published", to: "draft", adminOnly: true, event: "unpublished" }],
  archive: [{ from: "published", to: "archived", adminOnly: true, event: "archived" }],
  restore: [{ from: "archived", to: "draft", adminOnly: true, event: "restored" }],
};

export function applyTransition(
  id: string,
  action: TransitionAction,
  auth: { id?: number; role?: string; name?: string },
  note?: string,
): { ok: true; article: Article; published: boolean } | { ok: false; status: number; error: string } {
  const a = getArticle(id);
  if (!a) return { ok: false, status: 404, error: "Article introuvable." };
  const rule = TRANSITIONS[action]?.find((r) => r.from === a.status);
  if (!rule) return { ok: false, status: 409, error: "Transition impossible depuis cet état." };
  if (rule.adminOnly && !isAdmin(auth)) return { ok: false, status: 403, error: "Action réservée aux admins." };
  if (!rule.adminOnly && !isAdmin(auth) && !isAuthor(a, auth)) return { ok: false, status: 403, error: "Accès refusé." };

  a.status = rule.to;
  if (action === "approve") {
    if (!a.publishedAt) a.publishedAt = now();
    a.slug = uniquePublishedSlug(a.slug, a.id);
  }
  a.rev += 1;
  a.updatedAt = now();
  a.events.push({ at: now(), by: auth.name || "", type: rule.event, ...(note?.trim() ? { note: note.trim() } : {}) });
  writeArticle(a);
  return { ok: true, article: a, published: rule.to === "published" };
}

function uniquePublishedSlug(slug: string, selfId: string): string {
  const taken = new Set(readAll().filter((a) => a.status === "published" && a.id !== selfId).map((a) => a.slug));
  if (!taken.has(slug)) return slug;
  let n = 2;
  while (taken.has(`${slug}-${n}`)) n += 1;
  return `${slug}-${n}`;
}

// --- Commentaires de revue ---

export function addComment(
  id: string,
  auth: { id?: number; role?: string; name?: string },
  input: { text: string; blockId?: string | null },
): { ok: true; article: Article } | { ok: false; status: number; error: string } {
  const a = getArticle(id);
  if (!a) return { ok: false, status: 404, error: "Article introuvable." };
  if (!isAdmin(auth) && !isAuthor(a, auth)) return { ok: false, status: 403, error: "Accès refusé." };
  const text = (input.text || "").trim();
  if (!text) return { ok: false, status: 400, error: "Commentaire vide." };
  if (text.length > MAX_COMMENT) return { ok: false, status: 400, error: "Commentaire trop long." };
  if (auth.id == null) return { ok: false, status: 401, error: "Non authentifié." };
  a.comments.push({
    id: `c-${genId()}`,
    author: { userId: auth.id, name: auth.name || "", role: auth.role || "" },
    blockId: typeof input.blockId === "string" ? input.blockId : null,
    text,
    createdAt: now(),
    resolved: false,
  });
  a.updatedAt = now();
  writeArticle(a);
  return { ok: true, article: a };
}

export function setCommentResolved(
  id: string,
  auth: { id?: number; role?: string },
  commentId: string,
  resolved: boolean,
): { ok: true; article: Article } | { ok: false; status: number; error: string } {
  const a = getArticle(id);
  if (!a) return { ok: false, status: 404, error: "Article introuvable." };
  if (!isAdmin(auth) && !isAuthor(a, auth)) return { ok: false, status: 403, error: "Accès refusé." };
  const c = a.comments.find((x) => x.id === commentId);
  if (!c) return { ok: false, status: 404, error: "Commentaire introuvable." };
  c.resolved = resolved;
  a.updatedAt = now();
  writeArticle(a);
  return { ok: true, article: a };
}

// --- Uploads d'images ---

const isUploadUrl = (u: string) => /^\/articles\/uploads\/[a-z0-9-]+\/[a-z0-9]+\.(png|jpe?g|webp)$/i.test(u);

const IMAGE_TYPES: { ext: string; mime: string; test: (b: Buffer) => boolean }[] = [
  { ext: "png", mime: "image/png", test: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: "jpg", mime: "image/jpeg", test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: "webp",
    mime: "image/webp",
    test: (b) => b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
  },
];

export function detectImage(buf: Buffer): { ext: string; mime: string } | null {
  return IMAGE_TYPES.find((t) => t.test(buf)) ?? null;
}

export function saveUpload(
  id: string,
  auth: { id?: number; role?: string },
  buf: Buffer,
): { ok: true; url: string } | { ok: false; status: number; error: string } {
  const a = getArticle(id);
  if (!a) return { ok: false, status: 404, error: "Article introuvable." };
  if (!isAdmin(auth) && !isAuthor(a, auth)) return { ok: false, status: 403, error: "Accès refusé." };
  if (buf.length > MAX_IMAGE_BYTES) return { ok: false, status: 413, error: "Image trop volumineuse." };
  const kind = detectImage(buf);
  if (!kind) return { ok: false, status: 415, error: "Format d'image non supporté (png, jpeg, webp)." };
  const hash = createHash("sha256").update(buf).digest("hex").slice(0, 16);
  const dir = path.join(UPLOADS_SUB, id);
  fs.mkdirSync(dir, { recursive: true });
  const file = `${hash}.${kind.ext}`;
  fs.writeFileSync(path.join(dir, file), buf);
  return { ok: true, url: `/articles/uploads/${id}/${file}` };
}

// Sert un fichier uploadé (route publique). Garde anti-traversée + allowlist d'extension.
export function readUpload(id: string, file: string): { buf: Buffer; mime: string } | null {
  if (!/^[a-z0-9-]+$/i.test(id)) return null;
  if (path.basename(file) !== file) return null;
  const m = file.match(/\.(png|jpe?g|webp)$/i);
  if (!m) return null;
  const ext = m[1].toLowerCase();
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  try {
    return { buf: fs.readFileSync(path.join(UPLOADS_SUB, id, file)), mime };
  } catch {
    return null;
  }
}
