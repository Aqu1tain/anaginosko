// Test adversarial de la grammaire de marqueur (lib/lxx-materialize.mjs).
// Le danger : exclure de l'Écriture en silence. On vérifie que les mots français
// réels faits de lettres romaines (« il », « dix », « civil »…) et les gloses
// entre parenthèses restent du CONTENU, et que les vrais marqueurs sont exclus.
//   node tests/lxx-materialize.test.mjs
import { isMarkerSegment } from "../lib/lxx-materialize.mjs";

const CONTENT = ["il", "dix", "midi", "civil", "vil", "mil", "(car", "(c'est-à-dire", "David", "Dieu", "Or", "Ce", "Il"];
const MARKER = ["(26)", "(Vulg., XXXIV.)", "XII.", "(17)", "(Vulg., 49.)", "(50.)", ".", "-", "…", "«", "(XXXI)", "34."];

let fail = 0;
for (const w of CONTENT) if (isMarkerSegment(w)) { console.error(`ECHEC: "${w}" classé MARQUEUR, devrait être CONTENU`); fail++; }
for (const w of MARKER) if (!isMarkerSegment(w)) { console.error(`ECHEC: "${w}" classé CONTENU, devrait être MARQUEUR`); fail++; }

if (fail) { console.error(`\n${fail} échec(s).`); process.exit(1); }
console.log(`OK : ${CONTENT.length} contenus + ${MARKER.length} marqueurs, grammaire stricte validée.`);
