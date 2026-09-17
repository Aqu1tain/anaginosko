#!/usr/bin/env bash
# Actions distantes du déploiement courant, exécutées par le compte SSH du CI.
# Les commandes sudo doivent correspondre à deploy.sudoers.in.
set -euo pipefail
umask 022

ACTION="${1:-}"
TS="${2:-}"
[[ $# == 2 && "$TS" =~ ^[0-9]{14}$ ]] || { echo "usage: $0 <action> <YYYYMMDDHHMMSS>" >&2; exit 2; }
CI_USER="$(id -un)"
[[ "$CI_USER" =~ ^[a-z_][a-z0-9_-]*$ ]] || { echo "Compte de déploiement invalide" >&2; exit 2; }
WEB_ROOT=/opt/anaginosko-web-next
DATA_DIR=/var/www/anaginosko-next
ARB="$WEB_ROOT/arbitration"
REL="$WEB_ROOT/releases/$TS"

case "$ACTION" in
  prepare-data)
    # -h et -P : ne jamais suivre les liens symboliques lors du chown récursif.
    sudo -n /usr/bin/chown -hR -P -- "$CI_USER:$CI_USER" "$DATA_DIR/nt" "$DATA_DIR/lxx"
    ;;
  merge-arbitration)
    sudo -n -u anag-web /usr/bin/cp -- "$ARB/lxx-arbitration.json" "$ARB/lxx-arbitration.json.bak.$TS"
    sudo -n -u anag-web /usr/bin/node -- "$REL/scripts/merge-arb-git-server.mjs" \
      --git "$REL/data/lxx-arbitration.json" --server "$ARB/lxx-arbitration.json" \
      --out "$ARB/lxx-arbitration.json" --capture "$ARB/biblion-fresh.json" \
      --prev "$ARB/last-git-arbitration.json"
    ;;
  backup-validation)
    # Une absence est normale ; une sauvegarde refusée est une erreur bloquante.
    if [ -f "$ARB/lxx-biblion-validated.json" ]; then
      sudo -n -u anag-web /usr/bin/cp -- "$ARB/lxx-biblion-validated.json" "$ARB/lxx-biblion-validated.json.bak.$TS"
    fi
    ;;
  activate)
    sudo -n /usr/bin/chown -hR -P -- anag-web:anag-web "$DATA_DIR/lxx"
    ln -sfn "$REL" "$WEB_ROOT/current"
    sudo -n /usr/bin/systemctl restart anaginosko-web-next
    ;;
  *) echo "Action de déploiement inconnue : $ACTION" >&2; exit 2 ;;
esac
