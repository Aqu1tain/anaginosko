# Campagne d'alignement LXX — Rapport final (Phase 2/3)

Chaque verset grec Rahlfs 1935 finit **apparié** à son français Giguet 1872, ou
**déclaré « à traduire (prouvé) »** avec cause textuelle. Aucun appariement faux
n'a été shippé : un trou honnête l'emporte toujours sur un pairage confiant mais
faux. Doctrine armée en silence : zéro-perte au mot, deux témoins par lien,
canari par livre, NT identique à l'octet, écriture atomique.

## Résultat en un coup d'oeil

| | avant | après |
|---|---|---|
| grec liés | 27003 / 27199 | **27087 / 27199** |
| grec sans-état | 182 | **98** |
| trous français (contenu non servi) | 67 | **65** |
| zéro-perte (violations) | 0 | **0** |
| NT (fichiers modifiés) | — | **0 (byte-identique)** |

**84 versets grecs flottants nouvellement appariés**, et au total **155 appariements
convergents shippés** (le solde = corrections de liens décalés préexistants et
rattachements de contenu, qui n'abaissent pas le compte sans-état).

## Méthode (Phase 2 : lecture redondante)

108 agents lecteurs bilingues, **deux témoins indépendants par unité** :
- 28 suscriptions de psaumes (lot, gabarit Giguet) ;
- 53 chapitres à gap, chacun lu par 2 agents sur un dossier d'alignement parallèle
  grec↔Giguet incluant le voisinage inter-chapitres (indispensable pour les
  décalages massifs : 1 Chroniques, Siracide).

Convergence stricte : accord sur la disposition ET sur les sources (au mot) =
candidat. Toute divergence part en file Biblion. Total : **320 convergents,
157 divergences**.

## Phase 3 : merge à invariants (gate zéro-perte + quarantaine)

Chaque candidat est appliqué en scratch, matérialisé, et **mis en quarantaine
(→ Biblion) si la zéro-perte casse** (cascade de décalage incomplète), en boucle
jusqu'à 0 chevauchement. Puis triple garde avant écriture :
1. deux témoins (Phase 2) ;
2. zéro-perte au mot (materialize --check = 0) ;
3. concordance grec↔français spot-vérifiée à la main sur chaque livre shippé.

Résultat : **155 shippés · 126 en quarantaine → Biblion · 292 file Biblion (total)
· 2 à-traduire + 28 psaumes → KAN-67 · 2 marqueurs → exclusions**.

## Par livre

| livre | shippé | sans-état rest. | trous rest. | Biblion |
|---|---|---|---|---|
| 1ki | 60 | 14 | 16 | 38 |
| sir | 35 | 9 | 10 | 15 |
| ezk | 13 | 2 | 0 | 15 |
| jos | 11 | 2 | 0 | 10 |
| 1ch | 6 | 29 | 32 | 181 |
| pro | 5 | 4 | 3 | 11 |
| isa | 4 | 0 | 0 | 0 |
| num | 4 | 0 | 0 | 0 |
| tob | 4 | 0 | 0 | 0 |
| deu | 2 | 2 | 2 | 2 |
| jdt | 2 | 0 | 0 | 0 |
| job | 2 | 0 | 0 | 0 |
| jol | 2 | 0 | 1 | 0 |
| 1sa | 2 | 1 | 0 | 0 |
| sus | 2 | 0 | 0 | 0 |
| sng | 1 | 1 | 1 | 1 |
| psa | 0 (→ KAN-67) | 28 | 0 | 0 |
| autres (2ch, 2ma, bar, jer, neh) | 0 | 6 | 0 | 19 |

Livres **entièrement résolus** : isa, jdt, job, num, sus, tob.
**1 Chroniques** (décalage de livre entier + doubles généalogies) est déféré
presque intégralement à Biblion : c'est le livre qui exige le plus la scholarship
humaine, les deux témoins y ont honnêtement divergé plutôt que faussement convergé.

## Liens défaits/refaits — preuves par cas

**1 Rois 5 (versification 3 Règnes réordonnée).** L'ancien lien servait « Hiram,
roi de Tyr » au grec 5:1, qui dit en réalité « καὶ ἐχορήγουν οἱ καθεσταμένοι… τῷ
βασιλεῖ Σαλωμων » (les officiers approvisionnaient Salomon). Corrigé : grec 5:1 ←
Giguet 4:20-21 « (27) Ainsi, les officiers approvisionnaient le roi Salomon » ;
« Hiram » revient à son vrai grec 5:15 « ἀπέστειλεν Χιραμ βασιλεὺς Τύρου ». Tout
le chapitre ré-aligné, concordance vérifiée verset par verset.

**1 Rois 12 (fusion intro+discours).** Décalage +1 : grec 12:3 « καὶ ἐλάλησεν ὁ
λαὸς… λέγοντες » servait à tort « Ton père a rendu pesant notre joug » (= grec
12:4). Corrigé : grec 12:3 ← Giguet 12:2 « Et le peuple parla au roi Roboam,
disant : ».

**1 Rois 3 (jugement de Salomon).** Giguet fusionne des versets ; extraits de
mots posés : grec 3:12 ← Giguet 3:11[62-98] « …un cœur prudent » ; grec 3:16 ←
Giguet 3:11[215-230] « deux femmes prostituées apparurent ».

**Prologue du Siracide (1 prose ↔ 36 versets grecs).** La prose française unique
(Giguet 0:1) découpée en extraits de mots servant chaque verset grec du prologue
(grec 0:1 ← mots 0-4 + 19-27, grec 0:3 ← mots 5-18, …), zéro-perte préservée.

**1 Chroniques 5-6 (généalogie décalée).** Rahlfs 5:27-41 = Giguet 6:1-15 (grande
prêtrise) ; convergence forte des deux témoins, mais la cascade complète (Rahlfs
6:1 = Giguet 6:16, double « Fils de Lévi ») laisse des chevauchements → quarantaine
Biblion pour éviter tout faux pairage.

**Ézéchiel 7.** Grec 7:3 ← Giguet 7:3[0-3] « La fin est venue » (ἥκει τὸ πέρας) ;
grec 7:9 ← Giguet 7:8 « Car ainsi dit le Seigneur » (διότι τάδε λέγει κύριος).

## À traduire (prouvé) — KAN-67

- 2 versets grec-seuls avérés : **1sa 18:9** (« Saül regardait David de mauvais
  oeil »), **jer 32:13** (suscription LXX « ce que Jérémie prophétisa contre
  toutes les nations »).
- **28 suscriptions de psaumes** que Giguet a omises, traduites en maison via son
  propre gabarit (« εἰς τὸ τέλος » → « Pour la fin », « ψαλμὸς τῷ Δαυιδ » →
  « psaume de David », « ᾠδή » → « cantique », « ὑπὲρ τῆς ὀγδόης » → « pour
  l'octave »…). Deux témoins : 15 identiques au mot, 13 variantes triviales de
  style. À revoir avant service (data/lxx-psaumes-kan67.json).

## Exclusions nommées ajoutées

- **sir 32:3** « (Vulg., » et **sir 36:17** « (Vulg., XXXVI, 14.) » : fragments de
  renvoi vulgate scindés par la tokenisation, exclus avec raison nommée.

## File Biblion (292) — ce qui reste à sa main

Par cause : 126 quarantaine (cascade incomplète), 98 un-seul-témoin, 37 disposition,
14 sources, 9 à-traduire dans chapitre non résolu, 8 trou. Par livre : 1ch:181,
1ki:38, sir:15, ezk:15, pro:11, jos:10, neh:9, 2ch:6, autres. Chaque entrée porte
les deux propositions de lecteurs (grec et français en regard) pour arbitrage.

## Réserves connues (non régressées, documentées)

- **8 chevauchements auto** (psa 6:1, 7:15, 43:21, 55:11, 64:5, 99:1, 1ch 6:1, 6:2)
  restent en allowlist : ce sont des doubles-liens build-links préexistants (un
  verset Giguet servi à deux grecs), classe de bug distincte des versets flottants,
  hors périmètre de la lecture Phase 2 → correctif dédié à venir.
- **13 orphelins grecs documentés** (à-traduire prouvé de longue date) et **27
  versets français déclarés** (suppléés d'après l'hébreu/Vulgate, absents du grec
  Rahlfs) restent inchangés.

## Instruments (durables, un seul par fonction)

- `lib/lxx-materialize.mjs` — matérialiseur par-ref unique (runtime + build), zéro-perte au mot.
- `scripts/audit-coverage.mjs` — instrument unique de couverture (lit l'arbitrage, content-aware, dump GAPS_OUT).
- `scripts/materialize-links.mjs --apply` — matérialisation complète gatée (build + déploiement).
- Provenance : chaque appariement shippé porte `provenance: "phase2-convergence"` + la preuve textuelle des deux témoins.

## Bascule — ce qui s'est réellement passé (2026-07-08)

Pièce d'archive, pas récit lissé. La PR a été mergée dans `next` et le déploiement
préprod est passé au vert. Mais les 155 corrections **ne servaient pas** sur
préprod, et Job y a subi une **régression transitoire** (job 25:1 servi vide).

Cause : le déploiement re-matérialise `fr.json` depuis l'`ARB_DIR` **serveur**
(l'arbitrage vivant de Biblion, resté au baseline 151), pas depuis l'arbitrage
git (295). Rien n'écrivait git -> serveur. Donc les corrections Phase 2 ne
pouvaient pas atteindre le serveur, et les 11 overrides Job archivés en git mais
encore actifs côté serveur entraient en conflit avec le nouveau giguet (Giguet 25
= Baldad restauré) -> job 25 cassé. Prod non touchée (service distinct, port 3101).

Preuve du diagnostic (lecture seule serveur) : `ARB_DIR` serveur = 151 overrides,
1ki 5:1 absent, fr servi = « Hiram, roi de Tyr » (ancien faux) ; job 25:1 = vide.

Remédiation, en deux temps :
1. **Sync ponctuel** (`scripts/sync-arb-to-server.mjs`) : backup horodaté +
   checksum, précondition « serveur == baseline 151 » (STOP si Biblion a écrit
   entre-temps), remplacement par l'arbitrage git, re-matérialisation, preuves
   (1ki 5:1 = « les officiers », job 25:1 = « Baldad », materialize --check = 0,
   diff serveur borné EXACTEMENT à la partition attendue de 239 versets).
2. **Correctif d'architecture durable** (`scripts/merge-arb-git-server.mjs` +
   gate `scripts/check-sentinelles.mjs`, câblés dans `deploy-preprod.yml`) : git
   devient la source de vérité, l'`ARB_DIR` serveur la copie de travail de
   Biblion. Fusion à trois règles au déploiement (git-active installée ; archivée
   retirée ; fraîche Biblion conservée + capturée ; conflit BLOQUANT en refs
   nommées), puis gate sentinelle (un verset servi par lot de corrections
   vérifié) qui aurait attrapé le bug du jour.

## Suite (hors périmètre de cette PR, gaté par revue)

1. Revue Biblion des 292 (1 Chroniques en priorité) et des 28 suscriptions maison.
2. Service des traductions maison KAN-67 (mécanisme de provenance « maison » à ajouter au matérialiseur).
3. Correctif des 8 doubles-liens build-links.
4. Bascule prod : après revue de la PR, revue Biblion, sync serveur (option 1) et
   fusion durable en place (option 2). Prod ne bouge pas avant.
