# Anaginosko

Lire le grec koinè de la Bible (Nouveau Testament et Septante), lettre par lettre.
Application web mobile-first : touchez n'importe quelle lettre d'un texte pour
obtenir son nom, sa valeur et sa prononciation (érasmienne et restituée), mot par mot.

**En ligne : https://anaginosko.fr**

## Stack

- **Next.js 15** (App Router, React 19, TypeScript), rendu statique (SSG) : le
  texte grec est rendu côté serveur, donc lisible par les moteurs et les agents
  sans JavaScript.
- **Tailwind v4 + DaisyUI 5** (thèmes clair / sombre).
- **AdonisJS 6 + SQLite** : petit backend pour les annotations et les statistiques
  (`/api`).
- **Azure Speech (TTS neuronal)** pour l'audio de prononciation, pré-généré.
- Déploiement : sortie `standalone` servie par un service systemd derrière nginx
  sur un VPS ; audio et données NT servis depuis le disque.

## Lancer

```bash
npm install
npm run dev      # serveur de dev (next dev)
npm run build    # build-data + next build (génère src/data/texts.json puis le site)
npm run start    # lance la sortie standalone (node .next/standalone/server.js)
```

Pour la review locale avec le backend, `next.config.ts` proxifie `/api` vers
`http://localhost:3333` en développement.

## Fonctionnalités

- **Nouveau Testament complet** : 27 livres, ~260 chapitres, plus 12 passages
  choisis (qui sont des extraits dérivés des chapitres, donc toujours synchrones).
- **Septante** : Ancien Testament grec (Rahlfs 1935), 55 livres en trois tiers
  canoniques (protocanoniques, deutérocanoniques, surnuméraires).
- **Touchez une lettre** : fiche avec le nom, l'équivalent latin, la prononciation
  érasmienne et restituée, l'esprit / accent détectés sur cette occurrence, puis
  le mot complet (prononciation audible, analyse morphologique, lemme, glose).
- **Translittération interlinéaire** au choix (érasmienne ou restituée), syllabe
  accentuée en évidence.
- **Audio** de chaque forme (érasmien : voix fr-FR ; restituée : voix el-GR),
  piloté en IPA via SSML.
- **Concordance** : ~5 000 lemmes, recherche en grec ou en translittération,
  occurrences et glose Bailly.
- **Alphabet** de référence interactif : lettres, diphtongues, esprits, accents.
- **Mode manuscrit** (capitales, scriptio continua), **taille de texte** réglable,
  traduction française (néo-Crampon), thème, préférences mémorisées.
- **Annotations** philologiques (rôle contributeur), partagées entre un passage et
  son chapitre NT correspondant.

## Données et prononciation

- Texte grec : **SBLGNT** ; analyse morphologique : **MorphGNT** (CC BY-SA).
- Gloses : **Bailly** (via api.bailly.app, CC BY-NC-ND), couche philologique.
- Traduction française : **néo-Crampon** (domaine public).
- `scripts/build-data.mjs` dérive les passages des données NT (`public/nt/`) ;
  `scripts/build-nt-audio.mjs` génère l'audio via Azure.
- Règles de prononciation (`scripts/lib/translit-ipa.mjs`) :
  - **Érasmien (à la française)** : θ=t, χ=k, φ=f, υ=[y], αυ/ευ=[o]/[ø],
    αι/ει/οι glissées (« ail / abeille / boy »), hiatus conservés.
  - **Restituée (koinè)** : θ=[θ], χ=[x], β=[v], γ=[ɣ], η=ι (iotacisme),
    αυ/ευ=[av/af, ev/ef].

## Architecture

- `app/` : routes Next (Bibliothèque, NT, chapitre, passage, concordance,
  alphabet, mentions, admin), `generateStaticParams`, `generateMetadata`,
  `sitemap.ts`, `robots.ts`.
- `lib/nt-server.ts` : lecture `fs` des données NT au build (SSG).
- `src/components/` : `Reader`, `GreekText`, `LetterSheet`, `ConcordanceView`,
  `AlphabetView`, `AdminView`, etc.
- `src/lib/greek.ts` : analyse d'un graphème (Unicode NFD, esprit, accent, iota
  souscrit, sigma final) ; `tokenize.ts` : découpe en mots touchables.

## Licence

Tous droits réservés (voir [LICENSE](LICENSE)). Code et interface : Corentin
Renard. Les annotations et notes philologiques sont la propriété intellectuelle
de Biblion (Noah Jaubert).
