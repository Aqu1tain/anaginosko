# Déploiement production (VPS OVH, anaginosko.fr)

L'app Next.js (standalone) tourne sous systemd (`anaginosko-web`, utilisateur
`anag-web`) sur 127.0.0.1:3100, derrière nginx. Elle est déployée par
`.github/workflows/deploy.yml` à chaque push sur `main` : release horodatée dans
`/opt/anaginosko-web/releases/`, bascule du lien `current`, redémarrage.

## Données vivantes, hors release

- `/var/www/anaginosko/nt` et `/var/www/anaginosko/lxx` : corpus servis par nginx et lus
  par l'app (`LXX_DATA_DIR`). Le `fr.json` LXX est réécrit en direct par l'arbitrage.
  Resynchronisés seulement par `deploy_corpus=true`, qui fait un `rsync --delete`.
- `/opt/anaginosko-web/arbitration` (`ARB_DIR`) : arbitrage et traductions maison de prod.
- `/opt/anaginosko-web/articles` (`ARTICLES_DIR`) : articles, intros, profils, médias.
- `/var/www/anaginosko/audio` : mp3, jamais touchés par le déploiement.

Avant tout `deploy_corpus`, versionner l'arbitrage de prod dans `data/lxx-arbitration.json`.
`/var/www/anaginosko/lxx` appartient à `anag-web` (écritures de l'arbitrage) : `deploy_corpus`
y échoue sans préparation par l'administrateur. Pour le seul NT, lancer `deploy_nt`.

## nginx

- `anaginosko.fr.nginx` : vhost réel, dans `/etc/nginx/sites-available/anaginosko.fr`.
- `anaginosko-crawlers.conf` : limite par famille de robots, dans `/etc/nginx/conf.d/`.

Appliquer une modification (compte administrateur) :

```
sudo cp anaginosko-crawlers.conf /etc/nginx/conf.d/
sudo nginx -t && sudo systemctl reload nginx
```

## Secrets GitHub Actions

`VPS_HOST`, `VPS_USER` (anag-deploy, sudo restreint), `VPS_SSH_KEY`.
