# Préproduction — next.anaginosko.fr

Préprod auto-déployée à chaque push sur `next` (workflow `.github/workflows/deploy-preprod.yml`).
Même VPS que la prod, **strictement isolée** :

- App Next sur `127.0.0.1:3101` (service `anaginosko-web-next`), build avec
  `NEXT_PUBLIC_PREPROD=1` → mur de connexion in-app (comptes Biblion/Admin existants)
  + `noindex`.
- API AdonisJS sur `127.0.0.1:3901` (conteneur `anaginosko-api-next`, image prod
  réutilisée), **DB copiée de la prod** à chaque déploiement (volume `db-next`) :
  la préprod voit les annotations de la prod, mais ses écritures restent locales
  et **ne repartent jamais en prod**.
- Data statique NT/LXX propre à la préprod dans `/var/www/anaginosko-next`
  (issue de `next`, donc inclut la LXX pas encore en prod). Audio partagé avec la
  prod (lecture seule).
- La prod (`anaginosko-web`, `anaginosko-api`, volume `db`, nginx `anaginosko.fr`,
  `/var/www/anaginosko/{nt,lxx}`) n'est **jamais** touchée.

## Prérequis (une seule fois)

1. **DNS** : `next.anaginosko.fr` A/AAAA → IP du VPS. *(fait)*
2. **Secrets GitHub** : `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` — déjà présents (mêmes
   que le déploiement prod).
3. **Sudo de l'utilisateur de déploiement** : le provisioning installe un service,
   une config nginx, un certificat et un conteneur Docker. Sur le VPS, accorder le
   sudo sans mot de passe à l'utilisateur SSH de déploiement :

   ```sh
   echo '<VPS_USER> ALL=(root) NOPASSWD: ALL' | sudo tee /etc/sudoers.d/anaginosko-preprod
   sudo chmod 440 /etc/sudoers.d/anaginosko-preprod
   sudo visudo -cf /etc/sudoers.d/anaginosko-preprod
   ```

   Compromis de sécurité assumé (la clé de déploiement devient root-capable). Après
   le premier provisioning réussi, on peut restreindre à l'essentiel récurrent
   (`systemctl restart anaginosko-web-next`, `docker`, `certbot ... --keep-until-expiring`).

Ensuite, chaque push sur `next` (ou un `workflow_dispatch`) provisionne (idempotent)
puis déploie. La préprod est à **https://next.anaginosko.fr**, derrière le mur de
connexion.

## Pour la mise en prod (KAN-46 sur main)

Le bloc nginx prod sert déjà `/nt/.+\.json` du disque ; il faut y **ajouter `/lxx/`**
(le fichier `deploy/anaginosko.fr.nginx` du repo applicatif le montre, calqué sur
`/nt/`). Le workflow prod (`deploy.yml`) rsynce déjà `public/lxx` et pose `LXX_DATA_DIR`.
