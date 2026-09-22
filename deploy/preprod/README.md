# Préproduction - next.anaginosko.fr

Préprod auto-déployée à chaque push sur `next` (workflow `.github/workflows/deploy-preprod.yml`).
Même VPS que la prod, **strictement isolée** :

- App Next sur `127.0.0.1:3101` (service `anaginosko-web-next`), build avec
  `NEXT_PUBLIC_PREPROD=1` → mur de connexion in-app + `noindex`.
- API AdonisJS sur `127.0.0.1:3901` (conteneur `anaginosko-api-next`, image dédiée
  via `PREPROD_API_IMAGE`, sinon image prod), configuration dans `/opt/anaginosko-api-next/.env` et DB
  persistante propre (volume `db-next`). Un déploiement ne lit ni ne recopie la
  DB de production.
- Articles et profils publics dans `/opt/anaginosko-web-next/articles`, stockage
  persistant propre à la préproduction, jamais copié depuis la production.
- Data statique NT/LXX propre à la préprod dans `/var/www/anaginosko-next`
  (issue de `next`, donc inclut la LXX pas encore en prod). Audio partagé avec la
  prod (lecture seule).
- La prod (`anaginosko-web`, `anaginosko-api`, volume `db`, nginx `anaginosko.fr`,
  `/var/www/anaginosko/{nt,lxx}`) n'est **jamais** touchée.

## Prérequis (une seule fois)

1. **DNS** : `next.anaginosko.fr` A/AAAA → IP du VPS. *(fait)*
2. **Secrets GitHub** : `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` - déjà présents (mêmes
   que le déploiement prod).
3. **Configuration API préprod** : créer `/opt/anaginosko-api-next/.env` avec des
   valeurs propres à la préproduction. Le provisioning échoue explicitement si
   ce fichier manque et ne se replie jamais sur le `.env` de production.
   Pour une installation créée par l'ancien provisioning, remplacer le fichier
   historiquement copié depuis la production et renouveler ses secrets avant de
   considérer l'isolation comme complète. Ne pas recopier le fichier de prod.
4. **Provisioning administrateur distinct** : `provision.sh` installe une unité
   systemd, nginx/TLS et lance Docker. Il exige des droits administrateur ; limiter
   sudo au chemin de ce script livré par le CI ne constitue pas une restriction
   root. Ne pas accorder `NOPASSWD: ALL` au compte de déploiement courant.

## Déploiement courant et provisioning manuel

Un push sur `next` construit et déploie seulement le web et ses corpus. Il ne
réinstalle ni unité systemd, ni nginx, ni conteneur API, ni fichier Compose.
Un `workflow_dispatch` fait de même par défaut. L'option manuelle **provision**
est la seule qui lance aussi `provision.sh` : elle est réservée à une opération
administrateur autorisée. Les règles de déploiement ci-dessous ne donnent pas ces
droits ; cette option échouera si le compte utilisé n'a pas les permissions
administrateur nécessaires. Aucune élévation automatique n'est ajoutée.

Le provisioning doit avoir créé les répertoires de release, de données,
d'arbitrage et d'articles. `releases/` et le parent du lien `current` doivent être
inscriptibles par le compte SSH ; l'arbitrage et les articles appartiennent à
`anag-web`. Les fichiers d'arbitrage doivent rester lisibles par le compte SSH
(pour matérialisation et capture des artefacts). Le déploiement reprend les droits
NT/LXX avant `rsync`, puis rend la LXX au service avant la bascule.

### Permissions sudo du déploiement

Le fichier `deploy.sudoers.in` décrit les commandes exactes de
`deploy-actions.sh`. Il nécessite **sudo 1.9.10 ou plus récent** et les binaires
`/usr/bin/chown`, `/usr/bin/cp`, `/usr/bin/node`, `/usr/bin/systemctl` sur le VPS.
Un administrateur doit remplacer **DEPLOY_USER** par le nom du compte SSH
(et du groupe de même nom), vérifier les chemins réels et installer le résultat
avec propriétaire `root:root`, mode `0440`, après validation avec `visudo -cf`.
Valider ensuite la configuration complète avec `visudo -c`. Ne pas installer le
modèle contenant encore le marqueur, ni ajouter ces droits depuis le workflow.
Ne remplacer que la règle préprod concernée, après sauvegarde ; préserver les
règles des autres applications.

- En root : `chown` sans suivi des liens symboliques, uniquement pour les deux
  dossiers de données préprod et le retour de la LXX à `anag-web` ;
  `systemctl restart anaginosko-web-next` uniquement.
- En tant que `anag-web` : copies de sauvegarde des deux fichiers d'arbitrage,
  et script de fusion Node avec arguments fixés aux chemins préprod et aux
  releases horodatées. Aucun interpréteur livré par le CI n'est exécuté en root.
- Aucun droit sur Docker, certbot, nginx ou l'installation d'unités systemd.

Le compte `anag-web` existe déjà et peut être partagé avec la production : ce
modèle évite l'exécution Node en root mais ne crée pas une isolation entre comptes
système. Une séparation des utilisateurs de service reste un chantier distinct.

Toutes les commandes utilisent `sudo -n`, sans pseudo-terminal SSH : une commande
refusée échoue immédiatement. Ne pas utiliser `sudo -n true` comme diagnostic
global ; `true` peut simplement être absent de la liste autorisée. Examiner les
règles avec `sudo -l` et tester les **commandes exactes**, avec leurs arguments et
le bon utilisateur cible, lors d'une fenêtre de déploiement autorisée. Une erreur
de sauvegarde bloque le déploiement ; seul un fichier de validations absent est
ignoré. Le workflow expire après 30 minutes en cas de blocage d'un autre outil.

### Limites Docker persistantes

`docker-compose.preprod.yml` conserve les valeurs relevées le 17 septembre 2026 :
`mem_limit: 512m`, `memswap_limit: 1024m` (mémoire + swap), `cpus: 1`,
`pids_limit: 512`, logs `json-file`, `max-size: "20m"`, `max-file: "3"`.
Le prochain provisioning explicite recopiera ces limites, au lieu de les effacer.
Le déploiement web courant ne recrée pas le conteneur API.

Le dépôt API conserve séparément les limites de production dans son propre
`docker-compose.yml` : `768m` / `1280m`, 1 CPU, 512 processus et les mêmes logs.
Les deux changements sont indépendants et compatibles avec les versions déjà
déployées : aucune migration ni modification du contrat API. L'API peut être
déployée indépendamment ; le web nécessite d'abord l'installation des règles
sudo préprod. Les commits et PR doivent rester séparés par dépôt.

### Validation et mise en place

1. En local : `bash -n deploy/preprod/{provision,deploy-actions}.sh`,
   `node --test tests/preprod-deploy.test.mjs`, `visudo -cf` sur le modèle rendu,
   et validation Compose sans lire de fichier d'environnement réel.
2. Avant la première fusion : faire installer les règles sudo par l'administrateur
   et vérifier les propriétaires et chemins ci-dessus. Ne pas relancer un ancien
   run : il utiliserait encore son ancien workflow.
3. Après fusion autorisée vers `next` : suivre le nouveau run, contrôler les
   sauvegardes et l'artefact Biblion, les sentinelles et les smoke tests. Une
   préproduction réussie ne valide pas une release API non déployée.
4. En cas d'échec : ne pas élargir sudo ; relever la commande refusée et corriger
   sa règle ou ses prérequis. Les corpus sont transférés avant la bascule : une
   absence de redémarrage ne signifie pas un rollback des données.

Pour revenir sur ce changement, conserver les sauvegardes de la règle sudo
précédente et des fichiers modifiés ; faire revoir leur restauration par
l'administrateur. Ne pas réactiver le provisioning automatique ni retirer des
limites Docker pour débloquer un déploiement.

La préprod est à **https://next.anaginosko.fr**, derrière le mur de connexion
côté client, qui n'est pas une frontière de sécurité.

## Pour la mise en prod (KAN-46 sur main)

Le bloc nginx prod sert déjà `/nt/.+\.json` du disque ; il faut y **ajouter `/lxx/`**
(le fichier `deploy/anaginosko.fr.nginx` du repo applicatif le montre, calqué sur
`/nt/`). Le workflow prod (`deploy.yml`) rsynce déjà `public/lxx` et pose `LXX_DATA_DIR`.
