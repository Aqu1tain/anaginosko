# Anaginosko

Lire le grec koinè du Nouveau Testament, lettre par lettre. Application web
mobile-first : touchez n'importe quelle lettre d'un texte pour obtenir son nom,
sa valeur et sa prononciation (érasmienne et restituée).

**En ligne : https://aqu1tain.github.io/anaginosko/**

## Lancer

```bash
npm install
npm run dev      # serveur de dev (Vite)
npm run build    # build de production
npm run preview  # prévisualiser le build
```

## Fonctionnalités

- **Lecture** des passages du NT en grec, avec un grand affichage lisible.
- **Touchez une lettre** → fiche avec le nom, l'équivalent latin, la
  prononciation érasmienne et restituée, et l'esprit / accent détectés sur cette
  occurrence précise. La prononciation du mot complet s'affiche aussi.
- **Translittération interlinéaire** au choix (érasmienne ou restituée) :
  chaque mot reçoit sa prononciation sous le grec, syllabe accentuée en évidence.
- **Alphabet** de référence : 24 lettres, diphtongues, esprits, accents,
  ponctuation ; chaque lettre est touchable.
- Clavier : une seule tabulation entre dans le texte, puis les flèches
  parcourent les lettres et Entrée ouvre la fiche.
- Interface **DaisyUI**, thème clair (fond blanc) / sombre, préférences mémorisées.

## Données

Les textes viennent de `data-sources/` (SBLGNT, domaine public). Le script
`scripts/build-data.mjs` les normalise vers `src/data/texts.json` (lancé
automatiquement par `npm run build`, ou via `npm run data`).

Les numéros de versets ont été ajoutés une fois via `npm run enrich`
(`scripts/enrich-verses.mjs`), qui aligne chaque mot sur la liste de mots
MorphGNT/SBLGNT. Le résultat est figé dans `data-sources/passages.json`, donc le
build ne dépend pas du réseau.

La prononciation des lettres (`src/data/alphabet.ts`) suit le cours
« Introduction au grec biblique » : érasmien académique (θ=t, χ=k, ζ=dz…) et
restituée de la koinè (θ=th, χ=kh, ζ=z, β=b/v…).

## Architecture

- `src/lib/greek.ts` : analyse d'un graphème (découpage Unicode, retrait des
  diacritiques en NFD pour retrouver la lettre de base, détection esprit, accent,
  iota souscrit, sigma final).
- `src/lib/tokenize.ts` : découpe un texte en mots touchables.
- `src/components/` : `Library`, `Reader`, `GreekText`, `LetterSheet`,
  `AlphabetView`, `TopBar`.
- `src/hooks/` : routage par hash, état persistant.
