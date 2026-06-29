---
description: Attaque un ticket Jira KAN (branche + transitions + commits taggés)
---

Tu vas attaquer le ticket Jira **$ARGUMENTS** du projet **KAN** (« Site Anaginosko »,
cloudId `dffacc5c-3550-4191-90ab-0b3f5aa96e91`, https://anaginosko.atlassian.net).

Déroulé :

1. **Lis le ticket** via l'outil Atlassian (`getJiraIssue`) : résumé, description, epic
   parent, priorité, labels, statut courant. Résume-le en une phrase.
2. **Cadre l'attaque** : liste les fichiers concernés et un plan court. Si le périmètre
   est flou ou si c'est du contenu (label `biblion`), propose et attends un go avant de coder.
3. **Passe le ticket « En cours »** : `transitionJiraIssue`, transition id **31**.
4. **Branche** depuis `next` : `KAN-<n>-<slug>` (slug court en kebab-case tiré du résumé).
   Ne jamais committer sur `next`/`main` directement.
5. **Implémente** par commits conventionnels, **clé en fin de sujet** :
   `feat(scope): … (KAN-<n>)`. Pas d'emoji dans le code/commits.
6. **Vérifie** selon le cas : `npx tsc --noEmit`, build, ou aperçu navigateur (Playwright).
7. **Quand c'est prêt** : attends l'accord, puis pousse, ouvre la PR (base `next`, clé dans
   le titre) et passe le ticket en **« En cours de revue »** (id **41**).
8. **Après merge + déploiement vérifié** : passe le ticket en **« Terminé »** (id **51**).

Transitions KAN : `21` À faire · `31` En cours · `41` En cours de revue · `51` Terminé.
Rappels projet : PRs vers `next` (pas de `dev`), pas d'em-dash dans les textes Jira,
toujours attendre l'accord avant push / PR / déploiement.
