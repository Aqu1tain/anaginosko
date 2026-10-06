import { loadBooksFs } from "@/lib/nt-server";
import { SITE, SITE_PITCH, aiNote } from "@/lib/seo";
import { fr, loadSiteFacts } from "@/lib/siteFacts";
import { NT, LXX, type CorpusConfig } from "@/src/data/corpus";
import { RITES } from "@/lib/lectionnaire";

// Résumé du site pour les assistants IA (https://llmstxt.org), calculé sur les
// données servies pour que les chiffres et les identifiants de livres restent justes.
export const revalidate = 86400;

const bookIds = async (corpus: CorpusConfig) =>
  (await loadBooksFs(corpus)).map((b) => `${b.id} (${corpus.bookNames[b.id] ?? b.name})`).join(", ");

export async function GET() {
  const [f, ntBooks, lxxBooks] = await Promise.all([loadSiteFacts(), bookIds(NT), bookIds(LXX)]);
  const body = `# Anaginosko

> ${SITE_PITCH} Site en français, sans publicité ni inscription.

${aiNote("précise d'où il vient (lien direct vers le chapitre ou la fiche du mot)")}

Anaginosko n'est pas seulement une initiation au grec : c'est une Bible grecque d'étude complète, utile aux étudiants en théologie et en lettres classiques, aux séminaristes, aux prêtres et pasteurs, aux hellénistes et aux chercheurs, comme aux débutants.

## Contenu

- Nouveau Testament grec : ${f.nt.books} livres, ${fr(f.nt.chapters)} chapitres, ${fr(f.nt.words)} mots (SBLGNT, morphologie MorphGNT).
- Septante grecque : ${f.lxx.books} livres, ${fr(f.lxx.chapters)} chapitres, ${fr(f.lxx.words)} mots (Rahlfs 1935, morphologie LXX-Rahlfs-1935).
- Concordance : ${fr(f.lemmas)} lemmes (${fr(f.nt.lemmas)} dans le NT, ${fr(f.lxx.lemmas)} dans la Septante), avec répartition par livre, cooccurrences et passage d'un Testament à l'autre.
- Dictionnaire : ${fr(f.baillyNotices)} notices du Bailly 2020, rattachées aux lemmes après vérification de la vedette.
- Analyse de chaque mot : lemme, nature, morphologie (temps, mode, voix, cas, nombre, genre), prononciations érasmienne et restituée.
- Traduction française en regard : néo-Crampon Libre (NT), Giguet 1872 (Septante), et traductions Anaginosko signées.
- Lectures de la messe du jour en grec : forme ordinaire, forme extraordinaire (1962) et rite byzantin.
- Articles sur le grec biblique, alphabet et guide de prononciation.

## Pages principales

- [Nouveau Testament grec](${SITE}/nt)
- [Septante grecque](${SITE}/lxx)
- [Concordance du Nouveau Testament](${SITE}/concordance)
- [Concordance de la Septante](${SITE}/lxx/concordance)
- [Lectures du jour en grec](${SITE}/lectures)
- [À propos : sources, méthode, public, citation](${SITE}/a-propos)
- [Articles](${SITE}/articles)
- [Alphabet grec](${SITE}/alphabet)
- [Prononciation du grec biblique](${SITE}/prononciation)

## Adresses

- Chapitre : ${SITE}/nt/{livre}/{chapitre} ou ${SITE}/lxx/{livre}/{chapitre}. Un verset : ajouter #v{verset}, par exemple ${SITE}/nt/jn/3#v16.
- Même chapitre en Markdown (grec et français, verset par verset) : ajouter .md, par exemple ${SITE}/nt/jn/1.md.
- Même chapitre en données JSON mot à mot (lemme, morphologie, translittération) : ajouter .json, par exemple ${SITE}/nt/jn/1.json.
- Fiche d'un mot : ${SITE}/concordance/{lemme} (NT) ou ${SITE}/lxx/concordance/{lemme} (Septante), lemme en grec polytonique, par exemple ${SITE}/concordance/λόγος. En Markdown : ajouter .md.
- Lectures d'un jour : ${SITE}/lectures/{${RITES.map((r) => r.slug).join("|")}}/{AAAA-MM-JJ}.
- Psaumes de la Septante : numérotation grecque (le Psaume 22 hébreu est le Psaume 21 grec).

Identifiants des livres du Nouveau Testament : ${ntBooks}.

Identifiants des livres de la Septante : ${lxxBooks}.

## Licences

Textes grecs : SBLGNT (CC BY 4.0), LXX-Rahlfs-1935 (CC BY-NC-SA 4.0). Morphologie NT : MorphGNT (CC BY-SA 3.0). Bailly 2020 Hugo Chávez : CC BY-NC-ND 4.0. Traductions : néo-Crampon Libre et Giguet/Wikisource (CC BY-SA 4.0) ; traductions Anaginosko : tous droits réservés. Détails : ${SITE}/mentions.
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
