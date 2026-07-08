# Outil d'arbitrage de Biblion — V1 autonome

L'outil d'arbitrage devient lisible et autonome : Biblion voit sa file, tranche en
un clic ou à sa propre découpe, et rien ne s'écrit hors de l'ARB_DIR standard, au
format exact que lit le matérialiseur. Livré comme V1 complète ; il ajustera à
l'usage.

## Les six livrables

1. **File « À arbitrer » (292).** Charge `lxx-biblion-queue.json`. Chaque cas montre
   le grec et les deux propositions des lecteurs en regard, avec l'aperçu matérialisé
   (ce que chaque proposition SERT) et la preuve. Actions : adopter A / adopter B /
   ma propre découpe (l'éditeur d'extraits existant). Filtres par livre et par cause,
   compteur de progression, tri 1 Chroniques d'abord. Chaque décision écrit dans
   l'ARB_DIR (by: Βιβλίον + horodatage) et sort le cas de la file.
2. **Alerte de non-pavage à la saisie.** N'existait pas au niveau du verset édité :
   c'était le point le plus urgent (il prévient les queues d'Écriture amputée). Dans
   le Resolver, dès qu'un verset Giguet n'est couvert que par des extraits, les mots
   restants sont affichés avant validation, avec un rappel qu'ils doivent servir un
   autre verset grec.
3. **Badges de provenance** sur chaque entrée : Βιβλίον, convergence Φ2, ou maison,
   depuis les champs `by` / `provenance` / `maison` existants.
4. **Section « Archivées »** : les entrées `_archived` visibles avec raison et date.
   Les 11 overrides Job y apparaissent avec le message « ton alignement était juste,
   la donnée a été réparée, pas une correction de ta part ».
5. **Encart « depuis ta dernière visite »** : diff des entrées d'arbitrage
   (installées, fraîches, archivées) depuis un timestamp gardé côté outil
   (localStorage).
6. **File des suscriptions (28)** : les traductions maison de `lxx-psaumes-kan67.json`
   en relecture (grec, les deux témoins, décomposition, champ d'édition), même
   mécanisme d'écriture, badge maison.

## Gates

- **Zéro écriture hors ARB_DIR.** Toutes les décisions passent par `/resolve` (ou
  `/dismiss` pour les titres/marqueurs), qui écrit `lxx-arbitration.json` (et
  `lxx-biblion-dismissed.json`) dans l'ARB_DIR, jamais ailleurs.
- **Format = celui du matérialiseur, round-trip prouvé.** Une décision saisie
  (adopter A sur sir 0:2 -> extrait [[0,1,28,34]] ; suscription maison psa 4:1)
  écrit l'override au format standard ; après matérialisation, le verset servi
  correspond exactement (sir 0:2 = « et autres qui les ont suivis ; », psa 4:1 =
  « Pour la fin, parmi les psaumes, cantique de David. »).
- **Traduction maison** : nouveau champ `override.maison` (texte libre), servi tel
  quel par le matérialiseur unique (`materializeEntry`) au runtime ET au build.
  Round-trip testé.
- **Non-régression** : `tsc` propre, `next build` vert, `materialize --check` = 0,
  test adversarial vert, l'outil d'arbitrage existant (file ancienne, Parcourir,
  éditeur de chapitre) intact.

## Captures (préprod, données réelles)

- `01-file-a-arbitrer.png` : la file 292, 1 Chroniques d'abord, deux témoins, adopter A/B.
- `02-suscriptions.png` : les 28 suscriptions maison, deux témoins, décomposition gabarit.
- `03-archivees.png` : les 11 Job archivés avec le message « ton alignement était juste ».

## Notes

- Le panneau d'infos d'intro a été retiré (outil pour un expert, pas une page pédagogique).
- Aucun em-dash dans le nouvel UI.
- Prod inchangée ; livraison sur préprod, revue par Biblion à sa main.
