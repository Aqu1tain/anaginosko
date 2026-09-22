import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import {
  isArticleCategory,
  isAdminOnlyCategory,
} from "../src/data/articleCategories";

// Stockage éditorial des articles, côté Next (pas d'API AdonisJS : la préprod tourne
// sur l'image API de prod). Un fichier JSON par article dans ARTICLES_DIR, écritures
// atomiques (tmp+rename). ARTICLES_DIR est PERSISTANT (hors bundle réécrit à chaque
// déploiement) ; en dev il retombe sur .articles/ à la racine (gitignoré).
//
// Concurrence : chaque mutation lit-modifie-écrit dans UNE fonction synchrone, sans
// await interne. Node étant mono-thread, aucune autre exécution JS ne s'intercale :
// la séquence est atomique. Le compteur `rev` détecte en plus les sauvegardes sur une
// version périmée (deux onglets de l'auteur) et répond 409.

// Catégorie : id du registre partagé src/data/articleCategories.ts.
export type ArticleCategory = string;
export type ArticleStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "published"
  | "archived";
export type TransitionAction =
  | "submit"
  | "request_changes"
  | "approve"
  | "publish"
  | "revise"
  | "unpublish"
  | "archive"
  | "restore";
export type ArticleSnapshot = Pick<
  Article,
  "title" | "excerpt" | "cover" | "category" | "content" | "slug"
> & {
  revision: number;
  savedAt: string;
};
export type ReviewRequest = {
  id: string;
  revision: number;
  reviewerId: number | null;
  reviewerName: string | null;
  note: string;
  requestedAt: string;
  notification: "not_needed" | "pending" | "sent" | "failed";
};
export type Approval = {
  revision: number;
  userId: number;
  name: string;
  at: string;
};

export type ArticleAuthor = { userId: number; name: string; role: string };

export type ArticleComment = {
  id: string;
  author: ArticleAuthor;
  blockId: string | null;
  text: string;
  createdAt: string;
  resolved: boolean;
  threadId: string;
  quote: string | null;
  revision: number;
  editedAt?: string;
  deletedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
};

export type ArticleEvent = {
  at: string;
  by: string;
  type:
    | "created"
    | "submitted"
    | "changes_requested"
    | "approved"
    | "published"
    | "revised"
    | "approval_invalidated"
    | "unpublished"
    | "archived"
    | "restored";
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
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  content: unknown[];
  comments: ArticleComment[];
  events: ArticleEvent[];
  contentRevision: number;
  publishedVersion: ArticleSnapshot | null;
  versions: ArticleSnapshot[];
  reviewRequest: ReviewRequest | null;
  approval: Approval | null;
};

export type ArticleSummary = Omit<
  Article,
  "content" | "comments" | "events" | "versions" | "publishedVersion"
> & {
  hasPublishedVersion: boolean;
  commentsCount: number;
  unresolvedComments: number;
};

export const SCHEMA_VERSION = 2;
const MAX_CONTENT_BYTES = 1_000_000;
const MAX_COMMENT = 10_000;
const MAX_TITLE = 200;
const MAX_EXCERPT = 500;
const MAX_IMAGE_BYTES = 4_000_000;

const ARTICLES_DIR =
  process.env.ARTICLES_DIR || path.join(process.cwd(), ".articles");
const ARTICLES_SUB = path.join(ARTICLES_DIR, "articles");
const UPLOADS_SUB = path.join(ARTICLES_DIR, "uploads");

function ensureDirs() {
  fs.mkdirSync(ARTICLES_SUB, { recursive: true });
  fs.mkdirSync(UPLOADS_SUB, { recursive: true });
}

const articlePath = (id: string) => path.join(ARTICLES_SUB, `${id}.json`);

const genId = () => randomUUID();

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
    const a = JSON.parse(fs.readFileSync(articlePath(id), "utf8")) as Article;
    // Conversion additive en mémoire : aucun fichier ancien n'est réécrit à la lecture.
    a.contentRevision ??= a.rev;
    a.versions ??= [];
    a.reviewRequest ??= null;
    a.approval ??= null;
    if (a.publishedVersion === undefined)
      a.publishedVersion = a.status === "published" ? snapshot(a) : null;
    if (!a.versions.length && a.publishedVersion)
      a.versions.push(structuredClone(a.publishedVersion));
    for (const c of a.comments) {
      c.threadId ??= `legacy-${c.blockId ?? "general"}`;
      c.quote ??= c.blockId ? blockText(a.content, c.blockId) : null;
      c.revision ??= a.contentRevision;
    }
    return a;
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
  const {
    content: _c,
    comments,
    events: _e,
    versions: _v,
    publishedVersion,
    ...rest
  } = a;
  void _c;
  void _e;
  void _v;
  return {
    ...rest,
    hasPublishedVersion: !!publishedVersion,
    commentsCount: comments.filter((c) => !c.deletedAt).length,
    unresolvedComments: new Set(
      comments
        .filter((c) => !c.resolved && !c.deletedAt)
        .map((c) => c.threadId),
    ).size,
  };
};

// Liste pour le tableau de bord : admin voit tout, philologue voit les siens.
export function listArticles(viewer: {
  id?: number;
  isRoot?: boolean;
  permissions?: string[];
}): ArticleSummary[] {
  const all = readAll();
  const visible =
    canReview(viewer) || canPublish(viewer)
      ? all
      : all.filter((a) => a.author.userId === viewer.id);
  return visible
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .map(toSummary);
}

export function listPublished(): ArticleSummary[] {
  return readAll()
    .filter((a) => a.publishedVersion)
    .map(publicVersion)
    .sort((a, b) => ((a.publishedAt ?? "") < (b.publishedAt ?? "") ? 1 : -1))
    .map(toSummary);
}

export function getPublishedBySlug(slug: string): Article | null {
  const a = readAll().find(
    (a) => a.publishedVersion && a.publishedVersion.slug === slug,
  );
  return a ? publicVersion(a) : null;
}

function publicVersion(a: Article): Article {
  const published = a.publishedVersion!;
  return {
    ...a,
    ...published,
    rev: published.revision,
    contentRevision: published.revision,
    updatedAt: published.savedAt,
    status: "published",
    comments: [],
    events: [],
    versions: [],
    reviewRequest: null,
    approval: null,
  };
}

function snapshot(a: Article): ArticleSnapshot {
  return {
    title: a.title,
    excerpt: a.excerpt,
    cover: a.cover,
    category: a.category,
    content: structuredClone(a.content),
    slug: a.slug,
    revision: a.contentRevision,
    savedAt: now(),
  };
}

export function blockText(blocks: unknown[], id: string): string | null {
  for (const item of blocks) {
    if (!item || typeof item !== "object") continue;
    const b = item as { id?: string; content?: unknown; children?: unknown[] };
    if (b.id === id) return inlineText(b.content);
    const child = b.children && blockText(b.children, id);
    if (child !== null && child !== undefined) return child;
  }
  return null;
}
function inlineText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(inlineText).join("");
  if (value && typeof value === "object") {
    const v = value as { text?: string; content?: unknown };
    return v.text ?? inlineText(v.content);
  }
  return "";
}

// --- Écritures ---

function writeArticle(a: Article) {
  ensureDirs();
  const p = articlePath(a.id);
  const tmp = p + ".tmp";
  a.schemaVersion = SCHEMA_VERSION;
  fs.writeFileSync(tmp, JSON.stringify(a, null, 2));
  fs.renameSync(tmp, p);
}

// Relecture et publication sont des capacités distinctes.
const canReview = (auth: { isRoot?: boolean; permissions?: string[] }) =>
  !!auth.isRoot || !!auth.permissions?.includes("review");
const canPublish = (auth: { isRoot?: boolean; permissions?: string[] }) =>
  !!auth.isRoot || !!auth.permissions?.includes("publish");
const isAuthor = (a: Article, auth: { id?: number }) =>
  a.author.userId === auth.id;

export function createArticle(
  auth: {
    id?: number;
    isRoot?: boolean;
    permissions?: string[];
    name?: string;
  },
  input: { title: string; category: ArticleCategory },
):
  | { ok: true; article: Article }
  | { ok: false; status: number; error: string } {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) return { ok: false, status: 400, error: "Titre requis." };
  if (title.length > MAX_TITLE)
    return { ok: false, status: 400, error: "Titre trop long." };
  if (!isArticleCategory(input.category))
    return { ok: false, status: 400, error: "Catégorie invalide." };
  if (isAdminOnlyCategory(input.category) && !canReview(auth))
    return {
      ok: false,
      status: 403,
      error: "Catégorie « Vie du site » réservée aux admins.",
    };
  if (auth.id == null)
    return { ok: false, status: 401, error: "Non authentifié." };

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
    author: { userId: auth.id, name: auth.name || "", role: "" },
    createdAt: ts,
    updatedAt: ts,
    publishedAt: null,
    content: [],
    comments: [],
    events: [{ at: ts, by: auth.name || "", type: "created" }],
    contentRevision: 1,
    publishedVersion: null,
    versions: [],
    reviewRequest: null,
    approval: null,
  };
  writeArticle(article);
  return { ok: true, article };
}

export type ArticlePatch = {
  rev: number;
  title?: string;
  excerpt?: string;
  cover?: string | null;
  category?: ArticleCategory;
  content?: unknown[];
};

export function saveArticle(
  id: string,
  auth: { id?: number; isRoot?: boolean; permissions?: string[] },
  patch: ArticlePatch,
):
  | { ok: true; article: Article }
  | { ok: false; status: number; error: string } {
  const a = getArticle(id);
  if (!a) return { ok: false, status: 404, error: "Article introuvable." };
  // Seul l'auteur écrit le contenu ; l'admin relit et arbitre (à la GitHub).
  if (!isAuthor(a, auth))
    return {
      ok: false,
      status: 403,
      error: "Seul l'auteur peut modifier le texte.",
    };
  if (
    !["draft", "changes_requested", "in_review", "approved"].includes(a.status)
  )
    return {
      ok: false,
      status: 409,
      error: "Article non modifiable dans cet état.",
    };
  if (patch.rev !== a.rev)
    return {
      ok: false,
      status: 409,
      error: "Version périmée, rechargez l'article.",
    };

  const before =
    JSON.stringify(snapshot(a).content) +
    JSON.stringify([a.title, a.excerpt, a.cover, a.category]);
  if (patch.title !== undefined) {
    if (typeof patch.title !== "string")
      return { ok: false, status: 400, error: "Titre invalide." };
    const t = patch.title.trim();
    if (!t) return { ok: false, status: 400, error: "Titre requis." };
    if (t.length > MAX_TITLE)
      return { ok: false, status: 400, error: "Titre trop long." };
    a.title = t;
    if (!a.publishedAt) a.slug = slugify(t);
  }
  if (patch.excerpt !== undefined) {
    if (typeof patch.excerpt !== "string")
      return { ok: false, status: 400, error: "Résumé invalide." };
    if (patch.excerpt.length > MAX_EXCERPT)
      return { ok: false, status: 400, error: "Résumé trop long." };
    a.excerpt = patch.excerpt.trim();
  }
  if (patch.cover !== undefined) {
    if (patch.cover !== null && !isUploadUrl(patch.cover))
      return { ok: false, status: 400, error: "Couverture invalide." };
    a.cover = patch.cover;
  }
  if (patch.category !== undefined) {
    if (!isArticleCategory(patch.category))
      return { ok: false, status: 400, error: "Catégorie invalide." };
    if (isAdminOnlyCategory(patch.category) && !canReview(auth))
      return {
        ok: false,
        status: 403,
        error: "Catégorie « Vie du site » réservée aux admins.",
      };
    a.category = patch.category;
  }
  if (patch.content !== undefined) {
    if (!Array.isArray(patch.content))
      return { ok: false, status: 400, error: "Contenu invalide." };
    if (JSON.stringify(patch.content).length > MAX_CONTENT_BYTES)
      return { ok: false, status: 413, error: "Contenu trop volumineux." };
    a.content = patch.content;
  }
  const after =
    JSON.stringify(a.content) +
    JSON.stringify([a.title, a.excerpt, a.cover, a.category]);
  if (before !== after) {
    a.contentRevision += 1;
    if (a.approval || a.status === "in_review") {
      a.events.push({
        at: now(),
        by: "Auteur",
        type: "approval_invalidated",
        note: "Le contenu a changé : nouvelle relecture requise.",
      });
      a.status = "draft";
    }
    a.approval = null;
  }
  a.rev += 1;
  a.updatedAt = now();
  writeArticle(a);
  return { ok: true, article: a };
}

export function deleteArticle(
  id: string,
  auth: { id?: number; isRoot?: boolean; permissions?: string[] },
): { ok: true } | { ok: false; status: number; error: string } {
  const a = getArticle(id);
  if (!a) return { ok: false, status: 404, error: "Article introuvable." };
  const allowed = isAuthor(a, auth) && a.status === "draft" && !a.publishedAt;
  if (!allowed)
    return { ok: false, status: 403, error: "Suppression refusée." };
  fs.rmSync(articlePath(id), { force: true });
  fs.rmSync(path.join(UPLOADS_SUB, id), { recursive: true, force: true });
  return { ok: true };
}

// --- Machine à états de revue ---

export type TransitionOptions = {
  rev: number;
  reviewer?: { id: number; displayName: string } | null;
  // Revalidé auprès de l'API au moment de publier : compte actif et droit de relecture.
  activeReviewerIds?: number[];
};

export function applyTransition(
  id: string,
  action: TransitionAction,
  auth: {
    id?: number;
    isRoot?: boolean;
    permissions?: string[];
    name?: string;
  },
  note?: string,
  options?: TransitionOptions,
):
  | { ok: true; article: Article; published: boolean }
  | { ok: false; status: number; error: string } {
  const a = getArticle(id);
  if (!a) return { ok: false, status: 404, error: "Article introuvable." };
  if (!options || options.rev !== a.rev)
    return {
      ok: false,
      status: 409,
      error: "Version périmée : rechargez avant cette action.",
    };
  if (
    typeof note !== "undefined" &&
    (typeof note !== "string" || note.length > MAX_COMMENT)
  )
    return { ok: false, status: 400, error: "Note invalide." };
  const fail = (error: string, status = 409) => ({
    ok: false as const,
    status,
    error,
  });
  let event: ArticleEvent["type"];
  switch (action) {
    case "submit": {
      if (!isAuthor(a, auth))
        return fail("Seul l'auteur peut demander la relecture.", 403);
      if (!["draft", "changes_requested"].includes(a.status))
        return fail("Article non disponible pour une demande de relecture.");
      if (!a.content.length)
        return fail("Ajoutez du contenu avant la relecture.", 400);
      if (options.reviewer?.id === auth.id)
        return fail("Choisissez un autre relecteur.", 403);
      a.reviewRequest = {
        id: genId(),
        revision: a.contentRevision,
        reviewerId: options.reviewer?.id ?? null,
        reviewerName: options.reviewer?.displayName ?? null,
        note: note?.trim() ?? "",
        requestedAt: now(),
        notification: options.reviewer ? "pending" : "not_needed",
      };
      a.versions.push(snapshot(a));
      a.approval = null;
      a.status = "in_review";
      event = "submitted";
      break;
    }
    case "approve":
    case "request_changes": {
      if (!canReview(auth) || auth.id == null || isAuthor(a, auth))
        return fail(
          "La relecture doit être faite par un autre relecteur, y compris pour Admin.",
          403,
        );
      if (
        a.status !== "in_review" ||
        a.reviewRequest?.revision !== a.contentRevision
      )
        return fail("Cette version doit être soumise à nouveau.");
      if (
        a.reviewRequest.reviewerId !== null &&
        a.reviewRequest.reviewerId !== auth.id
      )
        return fail("La demande est attribuée à un autre relecteur.", 403);
      if (action === "request_changes" && !note?.trim())
        return fail("Précisez les corrections demandées.", 400);
      a.approval =
        action === "approve"
          ? {
              revision: a.contentRevision,
              userId: auth.id,
              name: auth.name ?? "Relecteur",
              at: now(),
            }
          : null;
      a.status = action === "approve" ? "approved" : "changes_requested";
      event = action === "approve" ? "approved" : "changes_requested";
      break;
    }
    case "publish": {
      if (!canPublish(auth))
        return fail("Permission de publication requise.", 403);
      if (
        a.status !== "approved" ||
        !a.approval ||
        a.approval.revision !== a.contentRevision ||
        a.approval.userId === a.author.userId
      )
        return fail(
          "Une approbation de cette version par un autre relecteur est obligatoire.",
        );
      if (!options.activeReviewerIds?.includes(a.approval.userId))
        return fail(
          "Le relecteur n'est plus actif ou autorisé. Demandez une nouvelle relecture.",
        );
      a.slug = uniquePublishedSlug(a.slug, a.id);
      a.publishedAt ??= now();
      a.publishedVersion = snapshot(a);
      a.status = "published";
      event = "published";
      break;
    }
    case "revise":
      if (!isAuthor(a, auth))
        return fail("Seul l'auteur peut préparer une révision.", 403);
      if (!["published", "approved", "in_review"].includes(a.status))
        return fail("Révision impossible dans cet état.");
      a.status = "draft";
      a.approval = null;
      event = "revised";
      break;
    case "unpublish":
    case "archive":
      if (!canPublish(auth))
        return fail("Permission de publication requise.", 403);
      if (!a.publishedVersion && action === "unpublish")
        return fail("Cet article n'est pas public.");
      a.publishedVersion = null;
      a.status = action === "archive" ? "archived" : "draft";
      a.approval = null;
      event = action === "archive" ? "archived" : "unpublished";
      break;
    case "restore":
      if (!canPublish(auth))
        return fail("Permission de publication requise.", 403);
      if (a.status !== "archived")
        return fail("Cet article n'est pas archivé.");
      a.status = "draft";
      a.approval = null;
      event = "restored";
      break;
    default:
      return fail("Action inconnue.", 400);
  }
  a.rev += 1;
  a.updatedAt = now();
  a.events.push({
    at: now(),
    by: auth.name || "",
    type: event,
    ...(note?.trim() ? { note: note.trim() } : {}),
  });
  writeArticle(a);
  return { ok: true, article: a, published: !!a.publishedVersion };
}

function uniquePublishedSlug(slug: string, selfId: string): string {
  // Réserver aussi les anciennes adresses pendant une dépublication/révision.
  const taken = new Set(
    readAll()
      .filter((a) => a.publishedAt && a.id !== selfId)
      .map((a) => a.slug),
  );
  if (!taken.has(slug)) return slug;
  let n = 2;
  while (taken.has(`${slug}-${n}`)) n += 1;
  return `${slug}-${n}`;
}

// --- Commentaires de revue ---

export function addComment(
  id: string,
  auth: {
    id?: number;
    isRoot?: boolean;
    permissions?: string[];
    name?: string;
  },
  input: {
    text: string;
    blockId?: string | null;
    threadId?: string;
    quote?: string | null;
    revision?: number;
  },
):
  | { ok: true; article: Article }
  | { ok: false; status: number; error: string } {
  const a = getArticle(id);
  if (!a) return { ok: false, status: 404, error: "Article introuvable." };
  if (!canReview(auth) && !canPublish(auth) && !isAuthor(a, auth))
    return { ok: false, status: 403, error: "Accès refusé." };
  const text = typeof input.text === "string" ? input.text.trim() : "";
  if (!text) return { ok: false, status: 400, error: "Commentaire vide." };
  if (text.length > MAX_COMMENT)
    return { ok: false, status: 400, error: "Commentaire trop long." };
  if (auth.id == null)
    return { ok: false, status: 401, error: "Non authentifié." };
  const existing = input.threadId
    ? a.comments.find((c) => c.threadId === input.threadId)
    : null;
  if (input.threadId && !existing)
    return { ok: false, status: 404, error: "Discussion introuvable." };
  if (!existing && input.revision !== a.contentRevision)
    return {
      ok: false,
      status: 409,
      error: "Le texte a changé : rechargez avant de commenter.",
    };
  const blockId = existing ? existing.blockId : (input.blockId ?? null);
  const sourceText = blockId ? blockText(a.content, blockId) : null;
  if (!existing && blockId && sourceText === null)
    return { ok: false, status: 400, error: "Passage introuvable." };
  if (
    !existing &&
    input.quote &&
    (typeof input.quote !== "string" || !sourceText?.includes(input.quote))
  )
    return {
      ok: false,
      status: 400,
      error: "La sélection ne correspond plus au texte.",
    };
  const threadId = existing?.threadId ?? genId();
  // Répondre à un fil résolu le rouvre explicitement.
  for (const c of a.comments.filter((c) => c.threadId === threadId))
    c.resolved = false;
  a.comments.push({
    id: `c-${genId()}`,
    author: { userId: auth.id, name: auth.name || "", role: "" },
    blockId,
    text,
    createdAt: now(),
    resolved: false,
    threadId,
    quote:
      existing?.quote ?? (input.quote || sourceText?.slice(0, 1000) || null),
    revision: existing?.revision ?? a.contentRevision,
  });
  a.updatedAt = now();
  writeArticle(a);
  return { ok: true, article: a };
}

export function setCommentResolved(
  id: string,
  auth: { id?: number; isRoot?: boolean; permissions?: string[] },
  commentId: string,
  resolved: boolean,
):
  | { ok: true; article: Article }
  | { ok: false; status: number; error: string } {
  const a = getArticle(id);
  if (!a) return { ok: false, status: 404, error: "Article introuvable." };
  if (!canReview(auth) && !canPublish(auth) && !isAuthor(a, auth))
    return { ok: false, status: 403, error: "Accès refusé." };
  const c = a.comments.find((x) => x.id === commentId);
  if (!c) return { ok: false, status: 404, error: "Commentaire introuvable." };
  c.resolved = resolved;
  a.updatedAt = now();
  writeArticle(a);
  return { ok: true, article: a };
}

export function setThreadResolved(
  id: string,
  auth: { id?: number; isRoot?: boolean; permissions?: string[] },
  threadId: string,
  resolved: boolean,
):
  | { ok: true; article: Article }
  | { ok: false; status: number; error: string } {
  const a = getArticle(id);
  if (!a) return { ok: false, status: 404, error: "Article introuvable." };
  if (!canReview(auth) && !canPublish(auth) && !isAuthor(a, auth))
    return { ok: false, status: 403, error: "Accès refusé." };
  const thread = a.comments.filter((comment) => comment.threadId === threadId);
  if (thread.length === 0)
    return {
      ok: false,
      status: 404,
      error: "Fil de commentaires introuvable.",
    };
  for (const comment of thread) {
    comment.resolved = resolved;
    comment.resolvedAt = now();
    comment.resolvedBy = String(auth.id);
  }
  a.updatedAt = now();
  writeArticle(a);
  return { ok: true, article: a };
}

export function editComment(
  id: string,
  auth: { id?: number; isRoot?: boolean; permissions?: string[] },
  commentId: string,
  text: string | null,
) {
  const a = getArticle(id);
  if (!a)
    return { ok: false as const, status: 404, error: "Article introuvable." };
  if (!canReview(auth) && !canPublish(auth) && !isAuthor(a, auth))
    return { ok: false as const, status: 403, error: "Accès refusé." };
  const c = a.comments.find((c) => c.id === commentId);
  if (!c || c.deletedAt)
    return {
      ok: false as const,
      status: 404,
      error: "Commentaire introuvable.",
    };
  if (c.author.userId !== auth.id)
    return {
      ok: false as const,
      status: 403,
      error: "Seul l'auteur peut modifier ce commentaire.",
    };
  if (
    text !== null &&
    (typeof text !== "string" || !text.trim() || text.length > MAX_COMMENT)
  )
    return { ok: false as const, status: 400, error: "Commentaire invalide." };
  if (text === null) {
    c.text = "";
    c.deletedAt = now();
  } else {
    c.text = text.trim();
    c.editedAt = now();
  }
  a.updatedAt = now();
  writeArticle(a);
  return { ok: true as const, article: a };
}

export function recordReviewNotification(
  id: string,
  requestId: string,
  sent: boolean,
) {
  const a = getArticle(id);
  if (!a || a.reviewRequest?.id !== requestId) return;
  // Un réessai concurrent peut échouer après la confirmation du premier envoi.
  if (a.reviewRequest.notification === "sent") return;
  a.reviewRequest.notification = sent ? "sent" : "failed";
  writeArticle(a);
}

// --- Uploads d'images ---

const isUploadUrl = (u: string) =>
  /^\/articles\/uploads\/[a-z0-9-]+\/[a-z0-9]+\.(png|jpe?g|webp)$/i.test(u);

const IMAGE_TYPES: {
  ext: string;
  mime: string;
  test: (b: Buffer) => boolean;
}[] = [
  {
    ext: "png",
    mime: "image/png",
    test: (b) =>
      b.length > 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47,
  },
  {
    ext: "jpg",
    mime: "image/jpeg",
    test: (b) =>
      b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    ext: "webp",
    mime: "image/webp",
    test: (b) =>
      b.length > 12 &&
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP",
  },
];

export function detectImage(buf: Buffer): { ext: string; mime: string } | null {
  return IMAGE_TYPES.find((t) => t.test(buf)) ?? null;
}

// Primitive d'upload d'image (validée + nommée par hash), partagée par les articles
// et les photos de profil. `subdir` est un segment sûr ([a-z0-9-]).
export function saveImageUpload(
  subdir: string,
  buf: Buffer,
): { ok: true; url: string } | { ok: false; status: number; error: string } {
  if (buf.length > MAX_IMAGE_BYTES)
    return { ok: false, status: 413, error: "Image trop volumineuse." };
  const kind = detectImage(buf);
  if (!kind)
    return {
      ok: false,
      status: 415,
      error: "Format d'image non supporté (png, jpeg, webp).",
    };
  const hash = createHash("sha256").update(buf).digest("hex").slice(0, 16);
  const dir = path.join(UPLOADS_SUB, subdir);
  fs.mkdirSync(dir, { recursive: true });
  const file = `${hash}.${kind.ext}`;
  fs.writeFileSync(path.join(dir, file), buf);
  return { ok: true, url: `/articles/uploads/${subdir}/${file}` };
}

export function saveUpload(
  id: string,
  auth: { id?: number; isRoot?: boolean; permissions?: string[] },
  buf: Buffer,
): { ok: true; url: string } | { ok: false; status: number; error: string } {
  const a = getArticle(id);
  if (!a) return { ok: false, status: 404, error: "Article introuvable." };
  if (!canReview(auth) && !isAuthor(a, auth))
    return { ok: false, status: 403, error: "Accès refusé." };
  return saveImageUpload(id, buf);
}

// Sert un fichier uploadé (route publique). Garde anti-traversée + allowlist d'extension.
export function readUpload(
  id: string,
  file: string,
): { buf: Buffer; mime: string } | null {
  if (!/^[a-z0-9-]+$/i.test(id)) return null;
  if (path.basename(file) !== file) return null;
  const m = file.match(/\.(png|jpe?g|webp)$/i);
  if (!m) return null;
  const ext = m[1].toLowerCase();
  const mime =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  try {
    return { buf: fs.readFileSync(path.join(UPLOADS_SUB, id, file)), mime };
  } catch {
    return null;
  }
}
