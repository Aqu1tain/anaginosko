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

## Mettre à jour le grec de la Septante

Quand le build LXX change le grec (chapitres, `books.json`, concordance), la mise en prod
se lance avec la liste des livres dont le français doit être régénéré :

```
gh workflow run promote.yml -f sync_lxx_books=est
```

Le déploiement dépose alors le grec dans la release (`lxx-greek/`, sans aucun `fr.json`) et
lance `scripts/sync-lxx.mjs` sous `anag-web`, avant la bascule :

1. le français des livres listés est régénéré dans un dossier temporaire depuis l'arbitrage
   de prod, puis contrôlé par les sentinelles ; un échec arrête tout, corpus servi inchangé ;
2. le `fr.json` de ces livres est sauvegardé dans `ARB_DIR/lxx-fr-backups/<release>/` ;
3. le grec est copié (aucune suppression), puis le français régénéré est installé.

Le `fr.json` des autres livres n'est ni copié ni réécrit. Quand seul le grec change,
lister un livre déjà régénéré (`est`) : son français ressort identique et n'est pas réécrit. Retour arrière : remettre le
`fr.json` sauvegardé, et relancer la synchronisation depuis le commit précédent pour le grec.

Droit à installer une fois par l'administrateur :

```
sudo install -m 0440 -o root -g root anag-web-lxx.sudoers /etc/sudoers.d/anag-web-lxx
sudo visudo -cf /etc/sudoers.d/anag-web-lxx
```

## nginx

- `anaginosko.fr.nginx` : vhost réel, dans `/etc/nginx/sites-available/anaginosko.fr`.
- `anaginosko-crawlers.conf` : limite par famille de robots, dans `/etc/nginx/conf.d/`.

Les robots d'indexation et d'entraînement ont chacun un seau (60 req/min, rafale de
20, puis 429 avec `Retry-After: 60`). Ne sont jamais limités : visiteurs, Googlebot,
Bingbot, aperçus de liens (`facebookexternalhit`…), requêtes déclenchées par un
utilisateur (`ChatGPT-User`, `Claude-User`…), `robots.txt`, `sitemap.xml`, `llms.txt`.

Appliquer une modification (compte administrateur, depuis ce dossier) :

```
sudo cp anaginosko-crawlers.conf /etc/nginx/conf.d/
sudo cp anaginosko.fr.nginx /etc/nginx/sites-available/anaginosko.fr
sudo nginx -t && sudo systemctl reload nginx
```

## Secrets GitHub Actions

`VPS_HOST`, `VPS_USER` (anag-deploy, sudo restreint), `VPS_SSH_KEY`.
