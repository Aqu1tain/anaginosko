# Déploiement (VPS OVH, anaginosko.fr)

Site statique servi par nginx sur le VPS, déployé automatiquement par GitHub
Actions à chaque push sur `main` (voir `.github/workflows/deploy.yml`).

## Architecture
- **App + données** (chapitres NT, concordance, français, gloses) : repo -> build
  Vite -> `dist/` -> rsync vers `/var/www/anaginosko/` sur le VPS.
- **Audio** (~27 k mp3, ~294 Mo) : généré séparément (`build-nt-audio.mjs`),
  uploadé une fois dans `/var/www/anaginosko/audio/`, **préservé** par le rsync
  du CI (`--exclude audio`). Servi depuis le même domaine (`/audio/`).

## nginx
`anaginosko.fr.nginx` : vhost (HTTPS via certbot, cache immuable assets/audio,
revalidation données NT, gzip). Installé dans `/etc/nginx/sites-available/`.

## Déploiement manuel
```
npm run build
rsync -az --delete --exclude audio dist/ anag-deploy@<host>:/var/www/anaginosko/
```

## Secrets GitHub Actions
- `VPS_HOST`, `VPS_USER` (anag-deploy, non privilégié), `VPS_SSH_KEY` (clé CI dédiée)
