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
4. **Travaille sur `next`** (un worktree `web-KAN-<n>-<slug>` si le chantier est long).
5. **Implémente** par commits conventionnels, **clé en fin de sujet** :
   `feat(scope): … (KAN-<n>)`. Pas d'emoji dans le code/commits.
6. **Vérifie** selon le cas : `npx tsc --noEmit`, lint, tests, build, aperçu navigateur.
7. **Quand c'est prêt** : avec l'accord de l'utilisateur, pousse sur `next` (pas de PR),
   vérifie la préprod et passe le ticket en **« En cours de revue »** (id **41**).
8. **Après « Mettre en prod » vérifié** : passe le ticket en **« Terminé »** (id **51**).

Transitions KAN : `21` À faire · `31` En cours · `41` En cours de revue · `51` Terminé.
Rappels projet : pas de PR, `main` n'avance que par « Mettre en prod », pas d'em-dash
dans les textes Jira, toujours attendre l'accord avant de pousser ou de mettre en prod.
