# Lectionnaires : format des données

Un fichier par rite et par année : `data/lectionnaire/<rite>/<année>.json`, rites
`romain` (forme ordinaire, calendrier de France), `1962` (forme extraordinaire) et
`byzantin` (usage grec-catholique, Pâques grégorienne).

Les fichiers ne contiennent que des références, jamais le texte d'un tiers. Le grec
et la traduction viennent du corpus du site.

```json
{
  "rite": "1962",
  "source": "Divinum Officium (MIT)",
  "days": {
    "2026-10-05": {
      "title": "Lundi de la 27e semaine du temps ordinaire",
      "detail": "Sainte Faustine Kowalska, mémoire facultative",
      "color": "vert",
      "note": "Pas de Divine Liturgie ce jour",
      "masses": [
        {
          "name": "Messe du jour",
          "readings": [
            {
              "kind": "lecture",
              "label": "Première lecture",
              "ref": "Galates 1, 6-12",
              "passages": [{ "corpus": "nt", "book": "ga", "chapter": 1, "from": 6, "to": 12 }]
            }
          ]
        }
      ]
    }
  }
}
```

- `title` est en français. `detail`, `color`, `note` et `name` sont facultatifs ;
  `name` ne sert que lorsqu'il y a plusieurs messes ce jour-là.
- `color` : `vert`, `violet`, `blanc`, `rouge`, `rose`, `noir` ou `or`.
- `projected: true` (facultatif) : jour calculé par le script, au-delà des données
  publiées par la source.
- `kind` : `lecture`, `psaume`, `cantique`, `epitre`, `apotre` ou `evangile`.
- `ref` est la référence affichée, en français, nom de livre en toutes lettres.
- `alternative: true` (facultatif) : cette lecture est une autre option que la
  précédente (forme brève, « ou bien »). L'affichage les présente au choix.
- `passages` : segments contigus, chacun dans un seul chapitre, numérotés comme le
  corpus du site (SBLGNT pour le NT, Rahlfs pour la Septante : psaumes en numérotation
  grecque, Jérémie dans l'ordre grec, etc.). Les lettres de demi-verset (12b) sont
  ignorées : le verset entier est pris. Une plage sur deux chapitres devient deux
  segments.
- Un passage absent de la Septante (ex. Jérémie 33, 14-16) porte `"absent": true` et
  garde la référence d'origine dans `ref`.

Contrôle : `node scripts/lectionnaire/check.mjs` vérifie que le chapitre et les deux
bornes de chaque segment existent dans le corpus. Un verset absent du texte critique au
milieu d'une plage (ex. Matthieu 18, 11) est toléré ; une borne absente ne l'est pas :
resserrer la plage sur les versets existants.
