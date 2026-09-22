# Comptes, relecture et publication

## Règles

Un titre de profil est libre et n'accorde aucun droit. Les rôles se cumulent,
avec éventuellement des permissions directes pour les exceptions. Les quatre
rôles initiaux sont Auteur, Relecteur, Responsable de publication et
Administrateur ; un gestionnaire de comptes peut les adapter ou en créer.

Le circuit est : brouillon → en relecture → approuvé → publié.
Le relecteur peut demander des corrections avant une nouvelle soumission.
Une demande vise la file commune ou un autre relecteur actif nommé, notifié par
e-mail. Le relecteur ne peut jamais être l'auteur, même Admin. La publication
revalide son habilitation et l'approbation de la version exacte. Modifier texte,
titre, résumé, catégorie ou couverture invalide l'approbation.
Avec uniquement Admin actif sur NEXT, il faut inviter un second relecteur pour
publier. Ne pas réactiver ni supprimer Biblion automatiquement.

Le bouton « Préparer une modification » ouvre une révision sans toucher à la
version publique ni à son adresse. La nouvelle version suit le même circuit.
Une dépublication/archivage est réservée aux personnes habilitées à publier ;
la suppression définitive est limitée au brouillon inédit de son auteur.

Les commentaires de relecture sont internes, distincts des éventuels commentaires
publics du site. Plusieurs fils peuvent viser le même passage. Chaque fil garde
sa citation et la version d'origine, accepte des réponses, et peut être résolu
ou rouvert. Chacun peut modifier/supprimer ses propres messages ; une suppression
laisse une trace. Un passage supprimé ne supprime pas la discussion.

## Stockage et limites explicites

Le contenu reste dans ARTICLES_DIR, persistant et distinct entre NEXT et prod.
Les comptes/rôles restent dans l'API et sa base dédiée. Un article v1 est lu sans
réécriture puis normalisé en v2 à sa prochaine mutation. Une version publique
historique reste publiée sans approbation rétroactive, mais sa prochaine
modification doit être revue.

`rev` protège les changements de contenu/statut contre une version périmée.
`contentRevision` identifie le contenu approuvé. Les commentaires et accusés
d'e-mail ne changent pas cette version. Les versions soumises et la copie publique
sont conservées ; l'historique n'est pas une sauvegarde de chaque frappe.

Le stockage JSON suppose un seul processus web écrivain. Toute évolution vers
plusieurs réplicas nécessite un stockage transactionnel partagé.
Il n'y a pas de coédition temps réel ni de mode « suggestion » modifiant le texte.
Les citations sont ancrées au bloc et gardées même si le passage change, sans
recalage automatique de caractères. La relecture d'une nouvelle version après
retrait du rôle d'un approbateur nécessite une nouvelle demande.

## Mise en ligne

Le nouveau web nécessite l'API de la branche éditoriale. Le compose NEXT accepte
une image dédiée via PREPROD_API_IMAGE ; la valeur par défaut reste l'image prod.
Un simple déploiement web NEXT ne valide donc pas le nouveau code API.
Suivre le runbook `docs/editorial-deployment.md` du dépôt API, avec autorisation
explicite des migrations et sauvegardes avant toute fusion/déploiement.

Contrôles : `npm run test:editorial`, `npm run test:definitions`,
`node tests/lxx-materialize.test.mjs`, `npm run lint`, `npx tsc --noEmit`,
`npm run build`. La CI lance les tests métier puis le build sans réécrire le corpus.


## Recette end-to-end locale

`npm run test:editorial:e2e` démarre les vrais serveurs Next et Adonis sur des
copies temporaires, migre une base vide et crée cinq comptes fictifs. Par défaut,
le dépôt API se trouve dans `../api-editorial-workflow` ; `E2E_API_DIR` permet de
choisir son chemin. Les dépendances doivent déjà être installées dans les deux
dépôts. Les ports 3299 et 3433 doivent être libres (`E2E_WEB_PORT` / `E2E_API_PORT`).
Le runner utilise Git uniquement pour sélectionner les sources à copier, y compris
les modifications locales et nouveaux fichiers non ignorés.

La recette vérifie 47 requêtes HTTP : permissions distinctes, accès aux brouillons,
notification et dédoublonnage, discussions, corrections, approbation, révocation,
publication, révision gardant la version publique, conflits et double acceptation
simultanée d'une invitation. Le fournisseur d'e-mail est simulé et refuse tout
destinataire hors `example.test` ; aucun envoi externe n'est effectué. Les fichiers
d'environnement, les bases et les articles locaux ne sont jamais copiés. Les
serveurs et données temporaires sont supprimés à la fin.

`npm run test:editorial:e2e -- --serve` garde ensuite l'environnement pour une
recette navigateur, jusqu'à Ctrl+C. Comptes fictifs : `author`, `reviewer`,
`publisher`, `manager`, `outsider` à `example.test`, mot de passe de fixture
`local-e2e-password`. Utiliser exclusivement l'adresse locale affichée.

Les responsables de publication peuvent participer aux discussions sans obtenir
le droit d'approuver ni celui de modifier le texte. Un accusé d'envoi confirmé
ne peut plus être remplacé par l'échec tardif d'un réessai concurrent.
