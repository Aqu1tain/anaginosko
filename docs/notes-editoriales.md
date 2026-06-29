# Notes éditoriales : annotations philologiques d'Anaginosko

Cadre de rédaction des annotations (les notes de Biblion sur le texte grec).
Référence : ticket KAN-23. Calé sur les 25 annotations déjà publiées (14 chapitres,
de Matthieu à Jude).

## Esprit

Anaginosko vise un niveau **académique** tout en assumant d'être un **lieu sûr pour
les catholiques**. Les notes éclairent le texte grec avec rigueur (manuscrits,
lexiques, langues sources, Pères) et, quand le passage le demande, défendent la
lecture catholique (mariale, trinitaire, sacramentelle) face aux objections
(traductions sectaires, etc.). Ton savant mais accessible, argumenté, jamais
polémique gratuit.

## Public

Lecteur curieux ou étudiant, croyant ou non, qui veut comprendre le grec et ses
enjeux. On explique, on ne présuppose pas l'helléniste.

## Ce qu'une note apporte (portée libre)

Une annotation peut **tout** couvrir. En pratique :

- **Lexique / sémantique** : sens d'un mot en contexte, au-delà du Bailly déjà
  affiché (ex. σκηνόω « dresser sa tente »).
- **Langues sources et comparées** : hébreu, araméen, syriaque, LXX (ex. כיפא,
  kēfāʾ, le « rocher » de Pierre).
- **Grammaire / syntaxe** : règles et idiomes (règle de Colwell sur θεός ; ἕως qui
  n'implique pas de changement après l'événement ; ἐν γαστρὶ ἕξει).
- **Critique textuelle** : variantes, témoins, éditions (μονογενὴς θεός ;
  ὁ ὢν ἐν τῷ οὐρανῷ).
- **Théologie** : portée d'un terme, lecture catholique argumentée.

Règle d'or : **une note = une idée**. Deux points distincts, deux notes.
Ne jamais reparaphraser le Bailly : il est déjà affiché sur la fiche.

## Portée technique (champ scope)

- **mot** : nuance d'une forme précise dans son verset.
- **phrase** : remarque qui court sur plusieurs mots (variante, syntaxe, théologie
  d'une proposition).
- **caractère** : point d'orthographe ou de phonétique (rare).

En pratique (25 notes publiées) : 14 sur `mot`, 11 sur `phrase`, `caractère` pas
encore employé.

## Longueur

Pas de gabarit unique, mais la **note développée est la norme** : sur les 25
annotations publiées, la médiane est d'environ **765 caractères** (un paragraphe
argumenté), l'étendue va de 30 (glose, « Le principe ou Le commencement ») à ~1250
(critique textuelle ou théologie). Principe : aussi long que nécessaire, aussi
court que possible. Limite technique : 4000 caractères.

## Sources (obligatoire)

Le champ `source` est **requis** (1 à 500 caractères). Format libre mais **précis**,
au cas par cas :

- Lexiques : « Bailly (ἀρχή) », « BDAG (σκηνόω) », « LSJ (πέτρος) », « BDB (כֵּף) »,
  « Thesaurus Syriacus », « Comprehensive Aramaic Lexicon ».
- Grammaires : « Robertson, A Grammar of the Greek NT, 1934, p. 702 » ;
  « Wallace, Greek Grammar Beyond the Basics, p. 325 » ; « BDF §290 ».
- Éditions / critique : « NA28 (Jean 1, 18) » ; témoins (P66, P75, Vaticanus,
  Sinaiticus).
- Auteurs anciens et Pères : « Jean Chrysostome, Homélie 55 sur Jean » ; « Eusèbe,
  Préparation évangélique, 6, 10 » ; « Épiphane, Panarion, éd. Karl Holl, GCS 31,
  353, l. 21 » ; « Diodore de Sicile, Bibliotheca historica, I, 32, 8 ».
- Plusieurs sources : séparées par « ; ».
- `link` (URL) quand la source est consultable en ligne.

Une source bâclée (« . », vide de sens) n'est pas acceptable : la rigueur de la
référence fait la crédibilité de la note.

## Langue et typographie

- Français. Grec cité en **alphabet grec** (ἄνωθεν), translittération entre
  parenthèses si utile, traduction entre « » ou guillemets droits.
- Guillemets français « ». **Pas d'em-dash.**

## Publication

Brouillon, relu, puis publié (champ `published`). Une note n'apparaît au public
qu'une fois publiée. Les annotations sont signées (`author`).

## Exemples de référence (déjà en prod)

- **Jn 1,1, θεός** (phrase, règle de Colwell) : réfute « le Verbe était un dieu ».
- **Jn 1,14, ἐσκήνωσεν** (mot, BDAG) : « dresser sa tente », résonance de la Shekinah.
- **Mt 1,25, ἕως** (mot, Bailly + 2 R 6,23 LXX) : ne suppose pas de changement après.
- **Jn 1,18, μονογενὴς θεός** (phrase, NA28 + témoins) : variante et traduction.
- **Mt 16 et Jn 21, ἀγαπάω / φιλέω, βόσκω / ποιμαίνω** : primauté de Pierre, « pais mes brebis ».
