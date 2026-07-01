// Barrière round-trip : affichage -> ref -> parseRef -> href -> source, sur un
// verset qui a CHANGÉ de chapitre (zone de transposition Siracide). Réplique les
// fonctions réelles (corpus.ts / passageLink.ts). Sort non-zéro si le cycle casse.
import fs from "node:fs";
const ROOT = "public/lxx";
const makeRef = (b, c) => `lxx-${b}-${c}`;
const parseRef = (r) => { const m = r.match(/^(nt|lxx)-(.+)-(\d+)$/); return m ? { corpus: m[1], book: m[2], chapter: Number(m[3]) } : null; };
const refHref = (r, w) => { const p = parseRef(r); return p ? `/${p.corpus}/${p.book}/${p.chapter}${w != null ? `?w=${w}` : ""}` : null; };

const fr = JSON.parse(fs.readFileSync(`${ROOT}/sir/fr.json`));
// Greek 31 = "sleeplessness of riches" ; sa traduction post-transposition vient de
// l'ex-Giguet 34. Round-trip : la ref grec 31 doit boucler et afficher les richesses.
const ref = makeRef("sir", 31);
const back = parseRef(ref);
const href = refHref(ref, 0);
const idOK = back && back.book === "sir" && back.chapter === 31 && href === "/lxx/sir/31?w=0";
const f31 = fr["31"]?.["1"] || "";
const correct = /veille|richesse/i.test(f31) && !/esp[eé]rances vaines|chim[eè]res/i.test(f31);
const f34 = fr["34"]?.["1"] || "";
const mirror = /esp[eé]rances vaines|chim[eè]res/i.test(f34);
console.log("ref round-trip:", idOK, "| Greek 31 shows riches:", correct, "| mirror (Greek 34 vain hopes):", mirror);
if (!(idOK && correct && mirror)) { console.error("ROUND-TRIP FAIL"); process.exit(1); }
console.log("ROUND-TRIP PASS");
