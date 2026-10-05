# Banc d'essai de l'assistant philologique (KAN-92)

Outils de la spike, hors production : ils servent à comparer des modèles sur les
mêmes questions, avec les seules données du site.

- `outils.mjs` : les outils que l'assistant appellerait (passage, lemme, lemmes,
  occurrences, morpho, forme, bailly), en ligne de commande sur `public/`.
- `consignes.md` : les consignes données au modèle et le format de réponse JSON
  (affirmations typées, lectures, traductions, citations structurées).
- `cas.json` : les 7 cas de test et la grille de notation (indispensables,
  analyses acceptables, erreurs graves, références attendues).
- `verifier.mjs` : contrôle automatique d'une réponse (format, citations internes
  vérifiées dans le corpus, références attendues manquantes) ;
  `node scripts/ia-bench/verifier.mjs <id-du-cas> <reponse.json>`.

Les références externes (articles, livres) ne sont pas vérifiables par le script :
la grille les fait relire par un humain.
