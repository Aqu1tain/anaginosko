# Classement canonique de la Septante

Sur Anaginosko, le classement canonique de la Septante **est le produit** : c'est
lui qui sert un public catholique tout en restant d'un niveau académique. Cette
note fait foi pour `scripts/lib/lxx-books.mjs` (build) et `src/data/lxx.ts`
(affichage). Référence : ticket KAN-46.

## Source et traitement

- **Texte grec** : Rahlfs 1935, via le dépôt open-source `eliranwong/LXX-Rahlfs-1935`
  (CC BY-NC-SA 4.0 + déclaration CCAT). Accentuation ramenée en NFC (le dépôt
  accentue à l'oxia ; NFC rétablit la forme tonos du NT, indispensable à la
  concordance, aux gloses Bailly et au recoupement inter-corpus).
- **Morphologie** : codes CCAT/Tauber, décodés en français par le même
  `decodeMorph` que le NT (adaptateur `decodeMorphCcat`). Couverture ~99,4 %.
- **Translittération, répartition, collocations, gloses Bailly, audio** : machinerie
  NT réutilisée telle quelle.
- **Traduction française** : Giguet 1872 (domaine public ; traduit la LXX elle-même,
  donc versification alignée). Ingestion en phase ultérieure.

## Les trois tiers

Chaque livre porte un champ `canon`, affiché en groupes explicites :

1. **`proto` - protocanoniques** (39) : le canon hébreu, communs à tous.
2. **`deutero` - deutérocanoniques** (10), marqués « canon catholique » : reçus comme
   Écriture par l'Église catholique.
3. **`extra` - surnuméraires** (6), marqués « hors canon » : présents dans la LXX (et
   parfois la tradition orthodoxe), non reçus comme Écriture par l'Église catholique.

## Désambiguïsation d'Esdras (traitée comme un point de doctrine)

Le texte Rahlfs contient deux livres « Esdras », et la numérotation LXX est l'inverse
de celle de la Vulgate. Pièges évités :

- **Esdras B′** (`2Esdr`, 23 ch.) = le grec d'Esdras + Néhémie. **Scindé** à la couture
  vérifiée (Esdras 10 a 44 versets ; Néhémie 1 commence par 11) :
  - `esd` **Esdras** ← `2Esdr` ch. 1–10 (proto)
  - `neh` **Néhémie** ← `2Esdr` ch. 11–23, **renumérotés 1–13** (proto)
  
  On scinde parce que, pour un lecteur catholique, Esdras et Néhémie sont deux livres
  canoniques (Trente), même si la LXX les transmet en un seul.
- **Esdras A′** (`1Esdr`, 9 ch.) = l'apocryphe grec (« Histoire des trois jeunes
  gens »). C'est le **3 Esdras de la Vulgate**, pas l'Esdras canonique :
  - `1es` **Esdras A'** (extra), noté « = 3 Esdras de la Vulgate ; non reçu comme Écriture ».
  
  On mène avec le sigle grec « Esdras A′ » pour ne jamais le confondre avec Esdras.

## Choix de recension (une seule version par livre canonique)

Le dépôt transmet plusieurs recensions ; on retient la forme reçue dans l'Église, en
cohérence avec la Vulgate et la translation Giguet, et on **exclut** les doublons :

| Livre | Retenu | Exclu |
|---|---|---|
| Daniel | `DanTh` (Théodotion) | `Dan` (ancien grec / OG) |
| Suzanne | `SusTh` (Théodotion) | `Sus` (OG) |
| Bel et le Dragon | `BelTh` (Théodotion) | `Bel` (OG) |
| Tobie | `TobBA` (texte court) | `TobS` (Sinaiticus, long) |
| Josué | `JoshB` (Vaticanus) | `JoshA` (fragmentaire) |
| Juges | `JudgB` (Vaticanus) | `JudgA` |

Les recensions exclues sont documentées ici et pourront faire l'objet d'un module
« variantes » ultérieur ; elles ne polluent pas la table des matières canonique.

## Cas structurels particuliers

- **Psaume 151** : présent dans la LXX comme « chapitre 151 » des Psaumes. Sorti en
  livre `ps151` (extra) ; `psa` (Psaumes, proto) ne garde que 1–150.
- **Prologue du Siracide** : traité comme chapitre **0** de `sir` (référence
  « Siracide, prologue »).
- **Livres mono-chapitre** : Abdias, Lettre de Jérémie, Suzanne, Bel - leurs versets
  sont sous le chapitre 1 (pas de « ch:vs » dans la source).
- **Proverbes** : numérotation grecque non contiguë (24 → 30, les ch. 25–29 manquent).
  Les chapitres réels sont listés dans `chapterList` (books.json) ; la navigation et
  le sitemap s'y conforment.
- **Lettre de Jérémie** (`lje`, deutero) : livre distinct dans la LXX ; = **Baruch 6**
  dans la Vulgate.
- **Additions grecques à Daniel** : Suzanne (`sus`) et Bel (`bel`) sont des livres
  deutérocanoniques distincts (= Daniel 13 et 14 dans la Vulgate) ; le Cantique des
  trois jeunes gens est inclus en ligne dans Daniel-Théodotion (ch. 3).
- **Esther** : `est` = l'Esther grec ; ses sections supplémentaires sont
  deutérocanoniques, marquées comme telles dans la note du livre.
- **Règnes / Paralipomènes** : libellés catholiques familiers en tête (1–2 Samuel,
  1–2 Rois, 1–2 Chroniques), nom LXX (1–4 Règnes, Paralipomènes) en note.

## Ordre d'affichage

Quatre groupes protocanoniques par genre (Pentateuque, Historiques, Poétiques et
sapientiaux, Prophétiques - les Douze avant les grands, ordre LXX), puis le tier
deutérocanonique, puis le tier surnuméraire.
