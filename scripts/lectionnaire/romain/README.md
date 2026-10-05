# Forme ordinaire (calendrier de France)

Source : API de l'AELF (api.aelf.org, archives depuis le 2 janvier 2016, environ dix-huit mois d'avance), dont on ne garde que les références. Au-delà du dernier jour publié, `build.mjs` projette : romcal (MIT, calendrier de France) donne la célébration du jour, la table apprise des jours AELF (célébration, cycle A/B/C ou I/II, lectures propres des mémoires) donne les lectures. `complements.json` fournit trois dimanches absents des archives. `valider.mjs` compare la projection aux jours AELF postérieurs à une date de coupure.

    npm install --prefix scripts/lectionnaire/romain --no-package-lock
    node scripts/lectionnaire/romain/fetch-aelf.mjs ~/.cache/anaginosko-aelf 2016 2030
    node scripts/lectionnaire/romain/build.mjs ~/.cache/anaginosko-aelf 2025 2030
    node scripts/lectionnaire/romain/valider.mjs ~/.cache/anaginosko-aelf 2027-01-01
    node scripts/lectionnaire/check.mjs romain
