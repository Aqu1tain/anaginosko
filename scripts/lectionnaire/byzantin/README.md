# Divine Liturgie byzantine (usage grec-catholique)

Source : [orthocal-python](https://github.com/brianglass/orthocal-python) de Brian Glass, licence MIT (`LICENCE-orthocal.txt`). On en garde les références des péricopes (usage grec) et l'algorithme (saut lucanien, dimanches de Luc, fêtes mobiles), réimplémenté avec la Pâque grégorienne et sans les saints propres à l'Orthodoxie.

`extraire.mjs` relit les données d'orthocal-python et écrit `tables/` (cycle pascal, ménée retenu et dimanches flottants, noms français). `generer.mjs` ne dépend que de `tables/` et du corpus du site.

    git clone https://github.com/brianglass/orthocal-python /tmp/orthocal
    node scripts/lectionnaire/byzantin/extraire.mjs /tmp/orthocal/fixtures/calendarium.json
    node scripts/lectionnaire/byzantin/generer.mjs 2025 2030
    node scripts/lectionnaire/check.mjs byzantin
