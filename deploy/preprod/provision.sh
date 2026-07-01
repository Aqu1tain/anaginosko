#!/usr/bin/env bash
# Provisioning idempotent de la préprod next.anaginosko.fr. Lancé SUR le VPS par
# le workflow deploy-preprod (utilisateur de déploiement avec sudo). Ne touche
# JAMAIS les ressources prod (service anaginosko-web, conteneur anaginosko-api,
# volume db, nginx anaginosko.fr, data /var/www/anaginosko/{nt,lxx}).
set -euo pipefail

echo "DIAG: $(id)"
sudo -n true 2>/dev/null && echo "DIAG: sudo NOPASSWD OK" || echo "DIAG: sudo NOPASSWD indisponible (mot de passe requis)"

CFG_DIR="$(cd "$(dirname "$0")" && pwd)"
CI_USER="$(id -un)"
WEB_ROOT=/opt/anaginosko-web-next
API_DIR=/opt/anaginosko-api-next
DATA_DIR=/var/www/anaginosko-next
DOMAIN=next.anaginosko.fr
CERTBOT_EMAIL="${CERTBOT_EMAIL:-corentinfox08@gmail.com}"
NODE_BIN="$(command -v node)"

DOCKER=docker
if ! docker info >/dev/null 2>&1; then DOCKER="sudo docker"; fi

echo "==> 1) arborescences (propriété $CI_USER, lisibles par nginx)"
sudo mkdir -p "$WEB_ROOT/releases" "$DATA_DIR/nt" "$DATA_DIR/lxx"
sudo chown -R "$CI_USER:$CI_USER" "$WEB_ROOT" "$DATA_DIR"
sudo chmod -R a+rX "$DATA_DIR"
# Overrides d'arbitrage : dossier PERSISTANT (hors releases/ effacées à chaque
# déploiement), inscriptible par le service (anag-web), lisible par le CI.
sudo mkdir -p "$WEB_ROOT/arbitration"
sudo chown -R anag-web:anag-web "$WEB_ROOT/arbitration"
sudo chmod 755 "$WEB_ROOT/arbitration"

echo "==> 2) unité systemd anaginosko-web-next"
sudo install -m644 "$CFG_DIR/anaginosko-web-next.service" /etc/systemd/system/anaginosko-web-next.service
sudo sed -i "s#^ExecStart=.*#ExecStart=$NODE_BIN server.js#" /etc/systemd/system/anaginosko-web-next.service
sudo systemctl daemon-reload
sudo systemctl enable anaginosko-web-next >/dev/null 2>&1 || true

echo "==> 3) API préprod (conteneur isolé, image prod réutilisée)"
PROD_API_DIR="$($DOCKER inspect anaginosko-api -f '{{ index .Config.Labels "com.docker.compose.project.working_dir" }}' 2>/dev/null | tr -d '\r' || true)"
sudo mkdir -p "$API_DIR"
sudo cp "$CFG_DIR/docker-compose.preprod.yml" "$API_DIR/docker-compose.yml"
if [ -n "$PROD_API_DIR" ] && sudo test -f "$PROD_API_DIR/.env"; then
  sudo cp "$PROD_API_DIR/.env" "$API_DIR/.env"
else
  echo "    AVERTISSEMENT : .env prod introuvable ; créez $API_DIR/.env à la main." >&2
fi
( cd "$API_DIR" && $DOCKER compose up -d )

echo "==> 4) rafraîchissement DB depuis la prod (unidirectionnel)"
if $DOCKER cp anaginosko-api:/app/tmp/db.sqlite3 /tmp/anag-preprod-db.sqlite3 2>/dev/null; then
  $DOCKER cp /tmp/anag-preprod-db.sqlite3 anaginosko-api-next:/app/tmp/db.sqlite3
  for ext in -wal -shm; do
    if $DOCKER cp "anaginosko-api:/app/tmp/db.sqlite3$ext" "/tmp/anag-preprod-db.sqlite3$ext" 2>/dev/null; then
      $DOCKER cp "/tmp/anag-preprod-db.sqlite3$ext" "anaginosko-api-next:/app/tmp/db.sqlite3$ext" 2>/dev/null || true
    fi
  done
  sudo rm -f /tmp/anag-preprod-db.sqlite3*  # docker (via sudo) a écrit en root
  # docker cp pose la DB en root ; l'API tourne en `node` et SQLite doit écrire le
  # fichier + le -wal/-shm dans /app/tmp. On rétablit la propriété en root (sinon
  # le chown lancé en `node` échoue) -> sinon SQLITE_READONLY au login.
  $DOCKER exec -u root anaginosko-api-next chown -R node:node /app/tmp 2>/dev/null || true
  $DOCKER restart anaginosko-api-next >/dev/null
  echo "    DB prod copiée vers la préprod."
else
  echo "    AVERTISSEMENT : copie DB prod échouée ; la préprod garde sa DB locale." >&2
fi

echo "==> 5) nginx + TLS (installé seulement si absent, pour préserver certbot)"
if [ ! -f "/etc/nginx/sites-available/$DOMAIN" ]; then
  sudo cp "$CFG_DIR/next.anaginosko.fr.nginx" "/etc/nginx/sites-available/$DOMAIN"
  sudo ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
  sudo nginx -t
  sudo systemctl reload nginx
  sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --redirect --keep-until-expiring
  echo "    nginx + certificat installés."
else
  echo "    config nginx déjà présente (préservée)."
fi

echo "OK provisioning préprod."
