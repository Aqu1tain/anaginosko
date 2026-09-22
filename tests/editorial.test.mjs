import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

// Exécuter le store réel dans un dossier temporaire, sans charger Next.
const require = createRequire(import.meta.url);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "anag-editorial-test-"));
process.env.ARTICLES_DIR = dir;
function load(file) {
  const source = fs.readFileSync(new URL(file, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const loaded = { exports: {} };
  const localRequire = (name) =>
    name === "server-only"
      ? {}
      : name.endsWith("articleCategories")
        ? load("../src/data/articleCategories.ts")
        : require(name);
  new Function("require", "module", "exports", code)(
    localRequire,
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}
const store = load("../lib/articles.ts");
after(() => {
  fs.rmSync(dir, { recursive: true });
});
const author = { id: 1, name: "Auteur", permissions: ["articles"] };
const reviewer = { id: 2, name: "Relectrice", permissions: ["review"] };
const publisher = { id: 3, name: "Publication", permissions: ["publish"] };
const rootAuthor = { ...author, isRoot: true };
function ok(result) {
  assert.equal(result.ok, true, result.error);
  return result.article;
}
function draft(who = author) {
  const a = ok(
    store.createArticle(who, { title: "Un article", category: "philologie" }),
  );
  return ok(
    store.saveArticle(a.id, who, {
      rev: a.rev,
      content: [
        {
          id: "p1",
          type: "paragraph",
          content: [{ type: "text", text: "Le texte initial." }],
        },
      ],
    }),
  );
}
function transition(a, action, who, extra = {}, note) {
  return store.applyTransition(a.id, action, who, note, {
    rev: a.rev,
    ...extra,
  });
}
function approved() {
  let a = draft();
  a = ok(transition(a, "submit", author));
  return ok(transition(a, "approve", reviewer));
}

test("Admin ne peut ni s'auto-approuver ni publier sans autre relecteur", () => {
  let a = draft(rootAuthor);
  assert.equal(
    transition(a, "submit", rootAuthor, {
      reviewer: { id: 1, displayName: "Admin" },
    }).status,
    403,
  );
  a = ok(transition(a, "submit", rootAuthor));
  assert.equal(transition(a, "approve", rootAuthor).status, 403);
  assert.equal(
    transition(a, "publish", rootAuthor, { activeReviewerIds: [1] }).ok,
    false,
  );
});
test("approbation et publication sont deux droits distincts", () => {
  const a = approved();
  assert.equal(a.status, "approved");
  assert.equal(store.getPublishedBySlug(a.slug), null);
  assert.equal(
    transition(a, "publish", reviewer, { activeReviewerIds: [2] }).status,
    403,
  );
  assert.equal(
    transition(a, "publish", publisher, { activeReviewerIds: [] }).ok,
    false,
  );
  const published = ok(
    transition(a, "publish", publisher, { activeReviewerIds: [2] }),
  );
  assert.equal(published.status, "published");
});
test("une demande nominative ne peut être validée que par le relecteur choisi", () => {
  let a = draft();
  a = ok(
    transition(a, "submit", author, {
      reviewer: { id: 2, displayName: "Relectrice" },
    }),
  );
  assert.equal(transition(a, "approve", { id: 4, isRoot: true }).status, 403);
  assert.equal(transition(a, "request_changes", reviewer, {}, "").status, 400);
  a = ok(transition(a, "request_changes", reviewer, {}, "Préciser la source."));
  assert.equal(a.status, "changes_requested");
});
test("modifier le contenu invalide l'approbation et le numéro périmé est rejeté", () => {
  const a = approved();
  const next = ok(
    store.saveArticle(a.id, author, { rev: a.rev, title: "Titre corrigé" }),
  );
  assert.equal(next.approval, null);
  assert.equal(next.status, "draft");
  assert.equal(
    transition(a, "publish", publisher, { activeReviewerIds: [2] }).status,
    409,
  );
  assert.equal(
    transition(next, "publish", publisher, { activeReviewerIds: [2] }).ok,
    false,
  );
});
test("la version publique reste stable pendant une révision puis garde son URL", () => {
  let a = approved();
  a = ok(transition(a, "publish", publisher, { activeReviewerIds: [2] }));
  const slug = a.slug;
  a = ok(transition(a, "revise", author));
  a = ok(
    store.saveArticle(a.id, author, { rev: a.rev, title: "Version corrigée" }),
  );
  assert.equal(store.getPublishedBySlug(slug).title, "Un article");
  assert.equal(
    store.listPublished().find((p) => p.id === a.id).title,
    "Un article",
  );
  a = ok(transition(a, "submit", author));
  a = ok(transition(a, "approve", reviewer));
  a = ok(transition(a, "publish", publisher, { activeReviewerIds: [2] }));
  assert.equal(a.slug, slug);
  assert.equal(store.getPublishedBySlug(slug).title, "Version corrigée");
  assert.equal(a.versions.length, 2);
});
test("plusieurs fils sur le même passage, citations persistantes, édition auteur seule", () => {
  let a = approved();
  a = ok(
    store.addComment(a.id, reviewer, {
      text: "Source ?",
      blockId: "p1",
      quote: "texte",
      revision: a.contentRevision,
    }),
  );
  const first = a.comments[0];
  a = ok(
    store.addComment(a.id, author, {
      text: "Autre discussion",
      blockId: "p1",
      revision: a.contentRevision,
    }),
  );
  assert.notEqual(first.threadId, a.comments[1].threadId);
  assert.ok(a.approval, "commenter n'invalide pas l'approbation");
  assert.equal(
    store.editComment(a.id, rootAuthor, first.id, "Changer").status,
    403,
  );
  a = ok(store.setThreadResolved(a.id, author, first.threadId, true));
  assert.equal(a.comments[1].resolved, false);
  a = ok(
    store.addComment(a.id, author, {
      text: "Réponse",
      threadId: first.threadId,
    }),
  );
  assert.equal(a.comments[0].resolved, false);
  a = ok(store.editComment(a.id, reviewer, first.id, null));
  assert.ok(a.comments[0].deletedAt);
  assert.equal(a.comments[0].text, "");
  a = ok(store.saveArticle(a.id, author, { rev: a.rev, content: [] }));
  assert.equal(a.comments[0].quote, "texte");
});
test("un relecteur sans rédaction voit les articles ; un auteur ne voit que les siens", () => {
  const a = draft();
  assert.ok(store.listArticles(reviewer).some((x) => x.id === a.id));
  assert.equal(
    store.listArticles({ id: 99, permissions: ["articles"] }).length,
    0,
  );
});
test("les anciens articles publiés restent publics sans réécriture à la lecture", () => {
  const old = {
    ...draft(),
    id: "legacy",
    schemaVersion: 1,
    status: "published",
    publishedAt: new Date().toISOString(),
    slug: "ancienne-url",
  };
  for (const field of [
    "contentRevision",
    "publishedVersion",
    "versions",
    "reviewRequest",
    "approval",
  ])
    delete old[field];
  const file = path.join(dir, "articles", "legacy.json");
  const bytes = JSON.stringify(old);
  fs.writeFileSync(file, bytes);
  assert.equal(store.getPublishedBySlug("ancienne-url").title, old.title);
  assert.equal(fs.readFileSync(file, "utf8"), bytes);
  const a = ok(transition(store.getArticle("legacy"), "revise", author));
  assert.ok(a.publishedVersion);
  assert.equal(a.versions[0].title, old.title);
  assert.equal(a.schemaVersion, 2);
});

test("l’accusé e-mail tardif ne remplace ni une révision ni une nouvelle demande", () => {
  let a = draft();
  a = ok(
    transition(a, "submit", author, {
      reviewer: { id: 2, displayName: "Relectrice" },
    }),
  );
  const oldRequest = a.reviewRequest.id;
  a = ok(transition(a, "revise", author));
  a = ok(
    store.saveArticle(a.id, author, { rev: a.rev, title: "Nouvelle demande" }),
  );
  a = ok(
    transition(a, "submit", author, {
      reviewer: { id: 2, displayName: "Relectrice" },
    }),
  );
  store.recordReviewNotification(a.id, oldRequest, true);
  const latest = store.getArticle(a.id);
  assert.equal(latest.reviewRequest.notification, "pending");
  assert.equal(latest.title, "Nouvelle demande");
  assert.equal(latest.rev, a.rev);
});

test("archivage et brouillon conservent l’historique, sans divulguer la relecture publique", () => {
  let a = approved();
  a = ok(
    store.addComment(a.id, reviewer, {
      text: "Note interne",
      revision: a.contentRevision,
    }),
  );
  a = ok(transition(a, "publish", publisher, { activeReviewerIds: [2] }));
  const publicArticle = store.getPublishedBySlug(a.slug);
  assert.deepEqual(publicArticle.comments, []);
  assert.deepEqual(publicArticle.versions, []);
  assert.equal(publicArticle.reviewRequest, null);
  a = ok(transition(a, "archive", publisher));
  assert.equal(store.getPublishedBySlug(a.slug), null);
  a = ok(transition(a, "restore", publisher));
  assert.equal(store.deleteArticle(a.id, author).status, 403);
  assert.equal(a.versions.length, 1);
  assert.equal(a.comments[0].text, "Note interne");
});


test("le responsable de publication peut discuter sans approuver ni écrire le texte", () => {
  let a = draft();
  a = ok(store.addComment(a.id, publisher, { text: "Source à vérifier", revision: a.contentRevision }));
  const comment = a.comments.at(-1);
  a = ok(store.editComment(a.id, publisher, comment.id, "Source vérifiée"));
  a = ok(store.setThreadResolved(a.id, publisher, comment.threadId, true));
  assert.equal(a.comments.at(-1).resolved, true);
  assert.equal(store.saveArticle(a.id, publisher, { rev: a.rev, title: "Interdit" }).status, 403);
  a = ok(transition(a, "submit", author));
  assert.equal(transition(a, "approve", publisher).status, 403);
});

test("un échec de notification tardif ne remplace pas un envoi confirmé", () => {
  let a = draft();
  a = ok(transition(a, "submit", author, { reviewer: { id: 2, displayName: "Relectrice" } }));
  store.recordReviewNotification(a.id, a.reviewRequest.id, true);
  store.recordReviewNotification(a.id, a.reviewRequest.id, false);
  assert.equal(store.getArticle(a.id).reviewRequest.notification, "sent");
});
