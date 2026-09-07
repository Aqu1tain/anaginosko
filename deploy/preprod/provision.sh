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
# Articles (KAN-47) : même logique, dossier PERSISTANT inscriptible par le service.
# Le chown -R "$CI_USER" ci-dessus a repris tout WEB_ROOT ; on rétablit anag-web.
sudo mkdir -p "$WEB_ROOT/articles/articles" "$WEB_ROOT/articles/uploads"
sudo chown -R anag-web:anag-web "$WEB_ROOT/articles"
sudo chmod 755 "$WEB_ROOT/articles"

echo "==> 2) unité systemd anaginosko-web-next"
sudo install -m644 "$CFG_DIR/anaginosko-web-next.service" /etc/systemd/system/anaginosko-web-next.service
sudo sed -i "s#^ExecStart=.*#ExecStart=$NODE_BIN server.js#" /etc/systemd/system/anaginosko-web-next.service
sudo systemctl daemon-reload
sudo systemctl enable anaginosko-web-next >/dev/null 2>&1 || true

echo "==> 3) API préprod (conteneur et données isolés, image prod réutilisée)"
sudo mkdir -p "$API_DIR"
sudo cp "$CFG_DIR/docker-compose.preprod.yml" "$API_DIR/docker-compose.yml"
if ! sudo test -s "$API_DIR/.env"; then
  echo "    ERREUR : configuration API préprod absente : $API_DIR/.env" >&2
  echo "    Installez une configuration propre à la préproduction ; la production ne sera pas copiée." >&2
  exit 1
fi
( cd "$API_DIR" && $DOCKER compose up -d )

echo "==> 4) conservation de la DB préprod"
# Le volume db-next est une source de données autonome. Un déploiement ne copie,
# ne rafraîchit et ne réinitialise jamais la base depuis la production.
echo "    DB préprod conservée ; aucune lecture de la DB de production."

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
