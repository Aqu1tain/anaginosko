#!/usr/bin/env bash
# Provisioning idempotent de la préprod next.anaginosko.fr. Lancé SUR le VPS par
# le workflow manuel deploy-preprod, option provision, avec des droits administrateur. Ne touche
# JAMAIS les ressources prod (service anaginosko-web, conteneur anaginosko-api,
# volume db, nginx anaginosko.fr, data /var/www/anaginosko/{nt,lxx}).
set -euo pipefail

echo "DIAG: $(id)"
# Aucun test sudo générique : chaque commande échoue immédiatement si elle est refusée.

CFG_DIR="$(cd "$(dirname "$0")" && pwd)"
CI_USER="$(id -un)"
WEB_ROOT=/opt/anaginosko-web-next
API_DIR=/opt/anaginosko-api-next
DATA_DIR=/var/www/anaginosko-next
DOMAIN=next.anaginosko.fr
CERTBOT_EMAIL="${CERTBOT_EMAIL:-corentinfox08@gmail.com}"
NODE_BIN="$(command -v node)"

DOCKER=docker
if ! docker info >/dev/null 2>&1; then DOCKER="sudo -n docker"; fi

echo "==> 1) arborescences (propriété $CI_USER, lisibles par nginx)"
sudo -n mkdir -p "$WEB_ROOT/releases" "$DATA_DIR/nt" "$DATA_DIR/lxx"
sudo -n chown -R "$CI_USER:$CI_USER" "$WEB_ROOT" "$DATA_DIR"
sudo -n chmod -R a+rX "$DATA_DIR"
# Overrides d'arbitrage : dossier PERSISTANT (hors releases/ effacées à chaque
# déploiement), inscriptible par le service (anag-web), lisible par le CI.
sudo -n mkdir -p "$WEB_ROOT/arbitration"
sudo -n chown -R anag-web:anag-web "$WEB_ROOT/arbitration"
sudo -n chmod 755 "$WEB_ROOT/arbitration"
# Articles (KAN-47) : même logique, dossier PERSISTANT inscriptible par le service.
# Le chown -R "$CI_USER" ci-dessus a repris tout WEB_ROOT ; on rétablit anag-web.
sudo -n mkdir -p "$WEB_ROOT/articles/articles" "$WEB_ROOT/articles/uploads"
sudo -n chown -R anag-web:anag-web "$WEB_ROOT/articles"
sudo -n chmod 755 "$WEB_ROOT/articles"

echo "==> 2) unité systemd anaginosko-web-next"
sudo -n install -m644 "$CFG_DIR/anaginosko-web-next.service" /etc/systemd/system/anaginosko-web-next.service
sudo -n sed -i "s#^ExecStart=.*#ExecStart=$NODE_BIN server.js#" /etc/systemd/system/anaginosko-web-next.service
sudo -n systemctl daemon-reload
sudo -n systemctl enable anaginosko-web-next

echo "==> 3) API préprod (conteneur et données isolés, image prod réutilisée)"
sudo -n mkdir -p "$API_DIR"
sudo -n cp "$CFG_DIR/docker-compose.preprod.yml" "$API_DIR/docker-compose.yml"
if ! sudo -n test -s "$API_DIR/.env"; then
  echo "    ERREUR : configuration API préprod absente ou inaccessible : $API_DIR/.env" >&2
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
  sudo -n cp "$CFG_DIR/next.anaginosko.fr.nginx" "/etc/nginx/sites-available/$DOMAIN"
  sudo -n ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
  sudo -n nginx -t
  sudo -n systemctl reload nginx
  sudo -n certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --redirect --keep-until-expiring
  echo "    nginx + certificat installés."
else
  echo "    config nginx déjà présente (préservée)."
fi

echo "OK provisioning préprod."
