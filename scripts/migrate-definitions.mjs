// Revue + réassignation des annotations de lemme utilisées comme définitions vers
// le système def:<lemma> (KAN-66). Lecture : GET /admin/annotations (token admin).
// Écriture : PUT /annotations/:id avec le ref changé en def:<lemma>, tous les
// autres champs préservés. Réversible (relancer avec l'ancien ref).
//
//   ANAGINOSKO_TOKEN=... node scripts/migrate-definitions.mjs                 # revue (dry-run)
//   ANAGINOSKO_TOKEN=... node scripts/migrate-definitions.mjs --apply 12,34   # réassigne ces IDs
//   ANAGINOSKO_TOKEN=... node scripts/migrate-definitions.mjs --revert 12,34  # def: -> lemma: (annulation)
//
// API par défaut : https://anaginosko.fr/api (surcharge via ANAGINOSKO_API).

const API = process.env.ANAGINOSKO_API || "https://anaginosko.fr/api";
const TOKEN = process.env.ANAGINOSKO_TOKEN;
if (!TOKEN) {
  console.error("ANAGINOSKO_TOKEN requis (token admin/philologue).");
  process.exit(1);
}
const H = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

const argv = process.argv.slice(2);
const mode = argv.includes("--apply") ? "apply" : argv.includes("--revert") ? "revert" : "review";
const idsArg = argv[argv.indexOf(mode === "revert" ? "--revert" : "--apply") + 1];
const wantedIds = new Set((idsArg || "").split(",").map((s) => Number(s.trim())).filter(Boolean));

const fromPrefix = mode === "revert" ? "def:" : "lemma:";
const toPrefix = mode === "revert" ? "lemma:" : "def:";

const admin = await fetch(`${API}/admin/annotations`, { headers: H }).then((r) => {
  if (!r.ok) throw new Error(`/admin/annotations ${r.status} (token admin requis)`);
  return r.json();
});
const candidates = admin.filter((a) => a.ref.startsWith(fromPrefix));

if (mode === "review") {
  console.log(`${candidates.length} annotations « ${fromPrefix}<lemma> » :\n`);
  for (const a of candidates) {
    const lemma = a.ref.slice(fromPrefix.length);
    console.log(`#${a.id}  ${lemma}  (source: ${a.source || "—"}${a.author ? ", " + a.author : ""})`);
    console.log(`      ${a.body.replace(/\s+/g, " ").slice(0, 180)}`);
  }
  console.log(`\nRéassigner en définitions : --apply <id1,id2,...>`);
  process.exit(0);
}

const targets = candidates.filter((a) => wantedIds.has(a.id));
if (!targets.length) {
  console.error("Aucun ID valide fourni. Ex : --apply 12,34");
  process.exit(1);
}
for (const a of targets) {
  const lemma = a.ref.slice(fromPrefix.length);
  // Annotation complète (avec link) via l'endpoint public par ref.
  const full = await fetch(`${API}/annotations?ref=${encodeURIComponent(a.ref)}`).then((r) => r.json());
  const src = full.find((x) => x.id === a.id) || a;
  const input = {
    ref: `${toPrefix}${lemma}`,
    verse: src.verse ?? null,
    wordIndex: src.wordIndex ?? null,
    endWordIndex: src.endWordIndex ?? null,
    graphemeIndex: src.graphemeIndex ?? null,
    body: src.body,
    source: src.source || "",
    link: src.link ?? null,
  };
  const res = await fetch(`${API}/annotations/${a.id}`, { method: "PUT", headers: H, body: JSON.stringify(input) });
  console.log(`#${a.id}  ${a.ref} -> ${input.ref}  : ${res.ok ? "OK" : "ÉCHEC " + res.status}`);
}
