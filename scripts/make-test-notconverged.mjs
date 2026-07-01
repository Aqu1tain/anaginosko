// Fixture SYNTHÉTIQUE : un chapitre « not-converged » pour tester la vue lourde
// (liage manuel + picker) AVANT que la passe ne produise les premiers vrais cas.
// Livre fictif « tst » (absent de books.json -> invisible au lecteur public). Le
// Giguet est réordonné/fusionné vs le grec, donc aucun lien auto : tout à la main.
//
//   node scripts/make-test-notconverged.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 1) Chapitre grec (colonne autoritaire).
const greek = {
  reference: "Chapitre-test 1",
  mots: [
    ...w("καὶ εἶπεν Δαυιδ πρὸς Σαλωμων τὸν υἱὸν αὐτοῦ", 1),
    ...w("ἐγὼ πορεύομαι ἐν ὁδῷ πάσης τῆς γῆς", 2),
    ...w("καὶ ἰσχύσεις καὶ ἔσῃ εἰς ἄνδρα", 3),
    ...w("καὶ φυλάξεις τὴν φυλακὴν κυρίου τοῦ θεοῦ σου", 4),
  ],
};
function w(text, verse) {
  return text.split(" ").map((g) => ({ grec: g, verse, erasmien: "", restituee: "", lemme: g, nature: "" }));
}
fs.mkdirSync(path.join(repo, "public/lxx/tst"), { recursive: true });
fs.writeFileSync(path.join(repo, "public/lxx/tst/1.json"), JSON.stringify(greek));

// 2) Giguet immuable « tst » : ORDRE DIFFÉRENT + une fusion (1:3 = grec 3+4).
const gig = JSON.parse(fs.readFileSync(path.join(repo, "data/giguet-lxx.json"), "utf8"));
gig.tst = {
  "1": {
    "1": "Je m’en vais par le chemin de toute la terre.", // = grec 1:2
    "2": "David dit à Salomon, son fils :", // = grec 1:1 (réordonné)
    "3": "Sois fort et sois un homme, et garde les observances du Seigneur ton Dieu.", // = grec 1:3 + 1:4 (fusion)
  },
};
fs.writeFileSync(path.join(repo, "data/giguet-lxx.json"), JSON.stringify(gig));

// 3) État : scaled mais NON convergé -> vue lourde, liage manuel.
const st = JSON.parse(fs.readFileSync(path.join(repo, "data/lxx-chapter-state.json"), "utf8"));
st.tst = { "1": { scaled: true, state: "not-converged", pending: 4 } };
fs.writeFileSync(path.join(repo, "data/lxx-chapter-state.json"), JSON.stringify(st));

// 4) fr.json vide côté tst (le lecteur ne l'utilise pas ; l'outil écrit ici).
fs.writeFileSync(path.join(repo, "public/lxx/tst/fr.json"), JSON.stringify({ _align: { blocks: [] } }));

console.log("Fixture not-converged créée : tst/1 (grec 4 versets, Giguet 3 versets réordonnés+fusionnés, 0 lien auto).");
