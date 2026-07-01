// Réconcilie la passe d'alignement (scale) : 2 lecteurs indépendants par groupe sur
// les chapitres bloqués. On n'expédie QUE ce qui converge ; toute divergence devient
// un item de file pour l'arbitrage Biblion (grain = verset). Le français en attente
// d'arbitrage n'est PAS affiché (grec seul = état honnête) et il est comptabilisé
// dans data/lxx-pending.json : la barrière d'intégrité vérifie que rien d'autre
// n'est perdu et que rien n'est inventé.
//
// Entrées  : /private/tmp/realign3/<groupe>-{A,B}.json (maps des lecteurs)
// Modifie  : data/lxx-links.json, data/lxx-queue.json, data/lxx-chapter-state.json,
//            data/lxx-pending.json, public/lxx/<livre>/fr.json
// Garanties: consommation unique (zéro-perte), sources existantes, dédoublonnage des
//            copies périmées (lignes orphelines consommées ailleurs), écriture atomique.
//
//   node scripts/reconcile-scale.mjs            (dry-run + rapport)
//   node scripts/reconcile-scale.mjs --apply

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LXX = path.join(repo, "public/lxx");
const RES_DIR = process.env.RES_DIR || "/private/tmp/realign3";
const APPLY = process.argv.includes("--apply");

const giguet = JSON.parse(fs.readFileSync(path.join(repo, "data/giguet-lxx.json"), "utf8"));
const links = JSON.parse(fs.readFileSync(path.join(repo, "data/lxx-links.json"), "utf8"));
const queue = JSON.parse(fs.readFileSync(path.join(repo, "data/lxx-queue.json"), "utf8"));
const chapterState = JSON.parse(fs.readFileSync(path.join(repo, "data/lxx-chapter-state.json"), "utf8"));

const gt = (b, c, v) => giguet[b]?.[String(c)]?.[String(v)] ?? null;
const skey = (s) => `${Number(s[0])}:${Number(s[1])}`;
const norm = (s) => String(s).normalize("NFC").replace(/\s+/g, " ").trim();

// ---------- 1. Charger et normaliser les maps des lecteurs ----------
function normalizeChapter(raw) {
  const srcByGr = new Map();
  for (const p of raw.pairs || []) {
    const gr = Number(p.gr);
    if (!srcByGr.has(gr)) srcByGr.set(gr, []);
    const src = [Number(p.frCh), Number(p.frV)];
    if (!srcByGr.get(gr).some((s) => s[0] === src[0] && s[1] === src[1])) srcByGr.get(gr).push(src);
  }
  return {
    srcByGr,
    orphanGreek: new Set((raw.orphanGreek || []).map((o) => Number(o.gr))),
    orphanFrench: new Set((raw.orphanFrench || []).map((o) => `${Number(o.frCh)}:${Number(o.frV)}`)),
  };
}

const files = fs.readdirSync(RES_DIR).filter((f) => f.endsWith(".json"));
const groups = new Map();
for (const f of files) {
  const m = f.match(/^(.+)-(A|B)\.json$/);
  if (!m) continue;
  const data = JSON.parse(fs.readFileSync(path.join(RES_DIR, f), "utf8"));
  if (!groups.has(m[1])) groups.set(m[1], {});
  groups.get(m[1])[m[2]] = data.books || data.chapters || {};
}

const greekVersesOf = (book, ch) => {
  const p = path.join(LXX, book, `${ch}.json`);
  if (!fs.existsSync(p)) return null;
  const mots = JSON.parse(fs.readFileSync(p, "utf8")).mots || [];
  const byV = new Map();
  for (const m of mots) {
    if (m.verse == null) continue;
    if (!byV.has(m.verse)) byV.set(m.verse, []);
    byV.get(m.verse).push(m.grec);
  }
  return byV;
};
const greekMaxOf = (book, ch) => {
  const byV = greekVersesOf(book, ch);
  return byV && byV.size ? Math.max(...byV.keys()) : null;
};

// ---------- 2. Propriété actuelle des versets Giguet (consommation unique) ----------
function currentOwners(book) {
  const blocked = new Set(
    (JSON.parse(fs.readFileSync(path.join(LXX, book, "fr.json"), "utf8"))._align?.blocks || []).map(Number),
  );
  const m = new Map();
  for (const [ref, src] of Object.entries(links[book] || {})) {
    if (blocked.has(Number(ref.split(":")[0]))) continue;
    if (Array.isArray(src)) for (const s of src) if (!m.has(skey(s))) m.set(skey(s), ref);
  }
  return { owners: m, blocked };
}
const ownersByBook = new Map();
const getOwners = (book) => {
  if (!ownersByBook.has(book)) ownersByBook.set(book, currentOwners(book).owners);
  return ownersByBook.get(book);
};

// ---------- 3. Convergence par verset ----------
// halfClaims : sources revendiquées par UN seul lecteur sur un verset convergent
// (scission disputée) -> file orphan-vs-split, pas d'affichage.
const perChapter = [];
const newQueueItems = [];

for (const [gid, readers] of groups) {
  if (!readers.A || !readers.B) {
    console.warn(`! groupe ${gid}: lecteur manquant — groupe ignoré (chapitres laissés pending-scale)`);
    continue;
  }
  const books = new Set([...Object.keys(readers.A), ...Object.keys(readers.B)]);
  for (const book of books) {
    const chs = new Set([...Object.keys(readers.A[book] || {}), ...Object.keys(readers.B[book] || {})]);
    for (const chStr of chs) {
      const ch = Number(chStr);
      const byV = greekVersesOf(book, ch);
      if (!byV) {
        console.warn(`! ${book} ${ch}: grec introuvable`);
        continue;
      }
      const A = normalizeChapter(readers.A[book]?.[chStr] || {});
      const B = normalizeChapter(readers.B[book]?.[chStr] || {});
      const rec = {
        book, ch, converged: 0, total: byV.size,
        divergences: [], orphanG: [], orphanF: [], halfClaims: [], links: new Map(),
      };

      for (const gr of [...byV.keys()].sort((a, b) => a - b)) {
        const sa = A.srcByGr.get(gr), sb = B.srcByGr.get(gr);
        const oa = A.orphanGreek.has(gr), ob = B.orphanGreek.has(gr);
        if (oa && ob) {
          rec.links.set(gr, []);
          rec.orphanG.push(gr);
          rec.converged++;
          continue;
        }
        const primaryAgree = sa && sb && sa[0] && sb[0] && sa[0][0] === sb[0][0] && sa[0][1] === sb[0][1];
        if (primaryAgree) {
          const setA = new Set(sa.map(skey)), setB = new Set(sb.map(skey));
          const common = sa.filter((s) => setB.has(skey(s)));
          for (const s of sa) if (!setB.has(skey(s))) rec.halfClaims.push({ src: skey(s), gr, reader: "A" });
          for (const s of sb) if (!setA.has(skey(s))) rec.halfClaims.push({ src: skey(s), gr, reader: "B" });
          rec.links.set(gr, common);
          rec.converged++;
        } else {
          rec.divergences.push({
            gr,
            a: sa ? sa.map(skey).join("+") : oa ? "orphelin" : "?",
            b: sb ? sb.map(skey).join("+") : ob ? "orphelin" : "?",
            proposals: [
              { reader: "A", sources: (sa || []).map((s) => [String(s[0]), String(s[1])]) },
              { reader: "B", sources: (sb || []).map((s) => [String(s[0]), String(s[1])]) },
            ],
          });
        }
      }
      for (const k of A.orphanFrench) if (B.orphanFrench.has(k)) rec.orphanF.push(k);
      perChapter.push(rec);
    }
  }
}

// ---------- 4. Verdicts + expédition (consommation unique) ----------
const verdicts = new Map();
for (const rec of perChapter) {
  verdicts.set(`${rec.book}:${rec.ch}`, rec.converged >= Math.ceil(rec.total / 2) ? "auto-resolved" : "not-converged");
}
const stillBlockedAfter = (book, gigCh) => {
  const v = verdicts.get(`${book}:${gigCh}`);
  if (v) return v === "not-converged";
  return currentOwners(book).blocked.has(Number(gigCh));
};

let shipped = 0, deferred = 0, orphanedG = 0;
for (const rec of perChapter) {
  const owners = getOwners(rec.book);
  links[rec.book] = links[rec.book] || {};
  for (const ref of Object.keys(links[rec.book])) if (ref.startsWith(`${rec.ch}:`)) delete links[rec.book][ref];

  for (const [gr, sources] of rec.links) {
    const ref = `${rec.ch}:${gr}`;
    if (sources.length === 0) {
      links[rec.book][ref] = [];
      orphanedG++;
      continue;
    }
    const missing = sources.find((s) => gt(rec.book, s[0], s[1]) == null);
    const conflict = sources.find((s) => owners.has(skey(s)) && owners.get(skey(s)) !== ref);
    const blockDup = sources.find((s) => stillBlockedAfter(rec.book, s[0]) && String(s[0]) !== String(rec.ch));
    if (missing || conflict || blockDup) {
      newQueueItems.push({
        book: rec.book, ref, kind: missing ? "reader-divergence" : conflict ? "zero-loss-conflict" : "cross-block-dependency",
        grain: "verse", priority: 1.8,
        reason: missing
          ? `Source Giguet inexistante citée par les lecteurs : ${skey(missing)}`
          : conflict
            ? `Giguet ${skey(conflict)} déjà lié au grec ${owners.get(skey(conflict))} — réattribution à trancher`
            : `Source dans le chapitre Giguet ${blockDup[0]} encore en bloc — lier après résolution`,
        proposals: [{ reader: "A+B", sources: sources.map((s) => [String(s[0]), String(s[1])]) }],
      });
      deferred++;
      continue;
    }
    links[rec.book][ref] = sources;
    for (const s of sources) owners.set(skey(s), ref);
    shipped++;
  }

  for (const d of rec.divergences) {
    const byV = greekVersesOf(rec.book, rec.ch);
    newQueueItems.push({
      book: rec.book, ref: `${rec.ch}:${d.gr}`, kind: "reader-divergence", grain: "verse", priority: 1,
      greek: (byV.get(d.gr) || []).join(" ").slice(0, 160),
      proposals: d.proposals.filter((p) => p.sources.length),
      reason: `Les deux lecteurs divergent : ${d.a} vs ${d.b}`,
    });
  }
}

// ---------- 4b. Sources en attente (non affichées) + balayage des non-consommés ----------
const touchedBooks = new Set(perChapter.map((r) => r.book));
const pendingByBook = new Map();
const addPending = (book, key) => {
  if (!pendingByBook.has(book)) pendingByBook.set(book, new Set());
  pendingByBook.get(book).add(key);
};
// (a) toute source citée par un item de file (ancien + nouveau) et non consommée
for (const it of [...queue, ...newQueueItems]) {
  if (!touchedBooks.has(it.book)) continue;
  const owners = getOwners(it.book);
  for (const p of it.proposals || []) for (const s of p.sources || []) {
    const key = skey(s);
    if (!owners.has(key) && gt(it.book, s[0], s[1]) != null) addPending(it.book, key);
  }
}
// (b) versets Giguet des chapitres scalés ni consommés ni déjà en attente :
//     - revendiqués par UN lecteur (scission disputée) -> file orphan-vs-split, non affichés
//     - orphelins convergents ou non revendiqués -> affichés en lignes de queue (sûr)
const displayOrphans = new Map(); // book -> [{frCh, frV}]
for (const rec of perChapter) {
  const owners = getOwners(rec.book);
  const pend = pendingByBook.get(rec.book) || new Set();
  const conv = new Set(rec.orphanF.map((k) => k));
  const half = new Map(rec.halfClaims.map((h) => [h.src, h]));
  for (const v of Object.keys(giguet[rec.book]?.[String(rec.ch)] || {})) {
    const key = `${rec.ch}:${Number(v)}`;
    if (owners.has(key) || pend.has(key)) continue;
    const h = half.get(key);
    if (h) {
      addPending(rec.book, key);
      newQueueItems.push({
        book: rec.book, ref: `${rec.ch}:${h.gr}`, kind: "orphan-vs-split", grain: "verse", priority: 2,
        reason: `Giguet ${key} rattaché au grec ${rec.ch}:${h.gr} par le lecteur ${h.reader} seul (scission disputée) — rattacher, orphéliser, ou autre verset`,
        proposals: [{ reader: h.reader, sources: [[String(rec.ch), String(v)]] }],
      });
    } else {
      if (!displayOrphans.has(rec.book)) displayOrphans.set(rec.book, []);
      displayOrphans.get(rec.book).push({ frCh: rec.ch, frV: Number(v) });
    }
  }
}

// ---------- 5. État, résumé ----------
const summary = {};
for (const rec of perChapter) {
  const verdict = verdicts.get(`${rec.book}:${rec.ch}`);
  summary[rec.book] = summary[rec.book] || { resolved: [], notConverged: [], queued: 0 };
  const chQueue = newQueueItems.filter((q) => q.book === rec.book && Number(q.ref.split(":")[0]) === rec.ch).length;
  summary[rec.book].queued += chQueue;
  (verdict === "auto-resolved" ? summary[rec.book].resolved : summary[rec.book].notConverged).push(
    `${rec.ch}(${rec.converged}/${rec.total}${chQueue ? `,file:${chQueue}` : ""})`,
  );
  chapterState[rec.book] = chapterState[rec.book] || {};
  chapterState[rec.book][rec.ch] = { scaled: true, state: verdict, pending: chQueue };
}

// ---------- 6. Application ----------
if (APPLY) {
  for (const book of touchedBooks) {
    const frPath = path.join(LXX, book, "fr.json");
    const fr = JSON.parse(fs.readFileSync(frPath, "utf8"));
    const blocks = new Set((fr._align?.blocks || []).map(Number));
    const owners = getOwners(book);
    const pend = pendingByBook.get(book) || new Set();
    const materializedNow = new Set();

    // 6a. Matérialisation des chapitres auto-résolus (depuis les liens).
    for (const rec of perChapter.filter((r) => r.book === book)) {
      if (verdicts.get(`${book}:${rec.ch}`) !== "auto-resolved") continue;
      const out = {};
      const byV = greekVersesOf(book, rec.ch);
      for (const gr of [...byV.keys()].sort((a, b) => a - b)) {
        const src = links[book][`${rec.ch}:${gr}`];
        if (!Array.isArray(src) || !src.length) continue;
        const text = src.map((s) => gt(book, s[0], s[1])).filter(Boolean).join(" ");
        if (text) out[gr] = text;
      }
      fr[String(rec.ch)] = out;
      blocks.delete(rec.ch);
      materializedNow.add(String(rec.ch));
    }

    // 6b. Orphelins affichés : placés en fin de leur chapitre grec (= frCh).
    for (const o of displayOrphans.get(book) || []) {
      const chKey = String(o.frCh);
      fr[chKey] = fr[chKey] || {};
      const gmax = greekMaxOf(book, o.frCh) ?? 0;
      let slot = Math.max(gmax, ...Object.keys(fr[chKey]).map(Number).filter(Number.isFinite), 0) + 1;
      fr[chKey][slot] = gt(book, o.frCh, o.frV);
    }

    // 6c. Dédoublonnage : lignes AU-DELÀ du max grec (ou chapitres sans grec) dont le
    //     texte égale une source consommée ou en attente -> supprimées (copies périmées).
    const removable = new Map(); // norm(texte) -> compteur de copies légitimes à retirer
    const bump = (t) => removable.set(t, (removable.get(t) || 0) + 1);
    for (const key of owners.keys()) {
      const [c, v] = key.split(":");
      const t = gt(book, c, v);
      if (t != null) bump(norm(t));
    }
    for (const key of pend) {
      const [c, v] = key.split(":");
      const t = gt(book, c, v);
      if (t != null) bump(norm(t));
    }
    for (const ch of Object.keys(fr)) {
      if (ch === "_align" || materializedNow.has(ch)) continue;
      const gmax = greekMaxOf(book, ch);
      for (const v of Object.keys(fr[ch])) {
        if (gmax != null && Number(v) <= gmax) continue; // ligne dans la plage grecque : intouchée
        const t = norm(fr[ch][v]);
        if ((removable.get(t) || 0) > 0) {
          delete fr[ch][v];
          removable.set(t, removable.get(t) - 1);
        }
      }
      if (gmax == null && Object.keys(fr[ch]).length === 0) delete fr[ch]; // chapitre fantôme vidé
    }

    fr._align = { blocks: [...blocks].sort((a, b) => a - b), tool: "reconcile-scale" };
    const tmp = frPath + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(fr));
    fs.renameSync(tmp, frPath);
  }

  queue.push(...newQueueItems);
  queue.sort((a, b) => a.priority - b.priority || a.book.localeCompare(b.book));
  const pendingOut = {};
  for (const [book, set] of pendingByBook) pendingOut[book] = [...set].sort();
  fs.writeFileSync(path.join(repo, "data/lxx-links.json"), JSON.stringify(links));
  fs.writeFileSync(path.join(repo, "data/lxx-queue.json"), JSON.stringify(queue, null, 2));
  fs.writeFileSync(path.join(repo, "data/lxx-chapter-state.json"), JSON.stringify(chapterState));
  fs.writeFileSync(path.join(repo, "data/lxx-pending.json"), JSON.stringify(pendingOut, null, 2));
}

// ---------- 7. Rapport ----------
console.log("=== réconciliation de la passe ===");
for (const book of Object.keys(summary).sort()) {
  const s = summary[book];
  const pendCount = pendingByBook.get(book)?.size || 0;
  console.log(
    `${book}: auto-résolus [${s.resolved.join(" ")}] · not-converged [${s.notConverged.join(" ")}] · file +${s.queued} · en attente ${pendCount} · orphelins affichés ${displayOrphans.get(book)?.length || 0}`,
  );
}
const totResolved = Object.values(summary).reduce((a, s) => a + s.resolved.length, 0);
const totNot = Object.values(summary).reduce((a, s) => a + s.notConverged.length, 0);
const totPend = [...pendingByBook.values()].reduce((a, s) => a + s.size, 0);
console.log(
  `\nTOTAL: ${totResolved} auto-résolus, ${totNot} not-converged, ${shipped} liens, ${orphanedG} orphelins grecs, ${deferred} différés, +${newQueueItems.length} file, ${totPend} sources en attente (non affichées)`,
);
console.log(APPLY ? "[APPLIED]" : "[dry-run] rien écrit.");
