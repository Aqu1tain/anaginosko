# Forme ordinaire (calendrier de France)

Source : API de l'AELF (api.aelf.org), dont on ne garde que les références des
lectures, jamais les textes. Le grec et la traduction viennent du corpus du site.

L'AELF publie environ dix-huit mois à l'avance. Pour étendre le calendrier :

    node scripts/lectionnaire/romain/fetch-aelf.mjs ~/.cache/anaginosko-aelf 2025 2030
    node scripts/lectionnaire/romain/build.mjs ~/.cache/anaginosko-aelf 2025 2030
    node scripts/lectionnaire/check.mjs romain
