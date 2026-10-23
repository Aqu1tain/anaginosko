# Conventions d'interface

Référence commune pour toute page ou composant. Objectif : une seule façon de faire
chaque chose, une hiérarchie claire, des textes courts.

## Mise en page

- Enveloppe de page : `pb-12 pt-6`. Pas de colonne étroite collée à gauche avec du vide
  à droite sur desktop (vérifier à 1280 et 1440 px). Le texte courant reste limité à
  `max-w-[42rem]`, mais la page, elle, utilise la largeur (colonnes, panneau latéral).
- Séparer par l'espace, pas par des traits : pas de bordure ni de `divide-y` entre les
  sections d'une page. Les traits restent permis à l'intérieur d'une liste ou d'un tableau
  (lignes d'une liste de comptes, de clés, de résultats).
- Échelle d'espacement : 1, 2, 3, 4, 6, 8, 12 (Tailwind). Plus d'espace autour d'un
  groupe qu'à l'intérieur. Titre de section plus près de son contenu que de la section
  précédente.

## Titres

- Titre de page (h1) des pages d'outil et de service : `text-3xl font-bold tracking-tight`.
  Exceptions assumées : accueil (titre éditorial), titre d'article, chapitre lu dans le
  lecteur.
- Titre de section (h2) : `text-lg font-semibold`.
- Sous-titre (h3) : `font-semibold`.
- Étiquette de groupe dans un panneau dense : `text-xs font-semibold uppercase
  tracking-wider text-base-content/50`.

## Couleurs du texte

Trois niveaux seulement : `text-base-content` (principal), `text-base-content/70`
(secondaire), `text-base-content/50` (discret : légendes, métadonnées, vides). Le rouge,
le vert et l'orange sont réservés aux états (erreur, succès, attention).

## Boutons

- Une seule action principale par vue : `btn btn-primary btn-sm`.
- Secondaire : `btn btn-outline btn-sm`. Tertiaire : `btn btn-ghost btn-sm`.
- `btn-xs` seulement dans les rangées denses (lignes de tableau, listes).
- Destructif : ghost ou outline avec `text-error` ; plein rouge seulement dans une
  confirmation.
- Pas de bouton en pilule (`rounded-full`) hors de l'accueil ; les pastilles de filtre ou
  de suggestion peuvent l'être.

## Cartes

Une carte seulement quand elle regroupe un objet qu'on manipule (un article, une leçon,
un membre) : `rounded-box border border-base-300 p-4` (p-5 si le contenu respire). Pas de
carte dans une carte. Pas de carte pour un simple bloc de texte.

## États

- Chargement : `Chargement…` en `text-sm text-base-content/50`.
- Vide : une phrase courte qui constate (« Aucune règle. »), puis l'action si elle
  existe. Pas d'explication ni d'encouragement.
- Erreur : la cause et quoi faire, en une phrase, `text-sm text-error`.

## Textes (deslop)

- Boutons : verbe + objet, 3 mots maximum (« Ajouter une clé », « Enregistrer »).
- Vocabulaire unique : Enregistrer (jamais Sauvegarder), Supprimer, Annuler, Fermer,
  Paramètres, Tableau de bord, Atelier.
- Succès : 5 mots maximum, sans « avec succès » (« Clé enregistrée. »).
- Pas de phrase d'aide, d'accroche ou de réassurance (« N'hésitez pas », « Ne vous
  inquiétez pas », « Vous pouvez… » quand l'interface le montre déjà).
- Pas de tiret long (—) dans le texte affiché. Pas d'emoji.
- Majuscule au premier mot seulement dans les libellés.
