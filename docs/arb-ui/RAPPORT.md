# Outil d'arbitrage — refonte pour Biblion et les admins

Outil simple et clair pour corriger l'alignement grec↔français de la LXX. Tout ce
qui s'écrit va dans l'ARB_DIR standard, au format que lit le matérialiseur (round-trip
prouvé). Trois onglets : Corriger, Suscriptions, Archivées.

## Corriger

**Carte des erreurs** (accueil) : les livres où il reste des versets à revoir,
compteur, pire d'abord. Ce qui est déjà tranché OU validé n'apparaît pas ; les livres
complets non plus. *(01-carte-erreurs.png)*

**Réalignement deux colonnes** : grec fixe à gauche (autorité), français Giguet à
droite qu'on fait **glisser d'un cran** pour tout recaler, aperçu en direct,
enregistrement du chapitre en un bloc. *(02 et 03)*
- Le glissement est **borné au chapitre courant** ; s'il faut le bon français d'un
  chapitre voisin (décalage 1 Chroniques), on clique « inclure ch. suivant/précédent ».
- **Traduire moi-même** un verset (override maison, texte libre servi tel quel).
- **« c'est bon »** : valider à la main un verset vérifié pour qu'il ne remonte plus
  comme erreur, même s'il était signalé.
- Les désaccords de lecteurs = simple drapeau « à vérifier », jamais un choix A/B.

## Crédit des traductions maison

Chaque traduction maison est créditée : au **verset** dans l'outil, et **en bas du
chapitre dans le lecteur** (au chapitre si un seul traducteur, sinon la liste). Le
philologue signe toujours « Biblion » (jamais son vrai nom) ; un admin signe de son
nom réel (Corentin Renard, Noah Jaubert). Porté par `fr.json._maison`, émis par le
matérialiseur unique, maintenu au runtime.

## Suscriptions · Archivées

Suscriptions : les 28 traductions maison de psaumes (grec, deux témoins, décomposition,
édition). Archivées : les 11 Job avec le message « ton alignement était juste, la
donnée a été réparée, pas une correction de ta part ».

## Droits

Le compte admin (Corentin, Noah) a exactement les mêmes droits que Biblion :
`role === "admin"` OU `philologist`, sur toutes les routes.

## Gates

- Zéro écriture hors ARB_DIR. Format = celui du matérialiseur, round-trip prouvé
  (adoption/glissement/maison → matérialisation → verset servi correspond).
- tsc propre, `next build` vert, `materialize --check` = 0, outil existant intact
  (Parcourir, éditeur de chapitre).
