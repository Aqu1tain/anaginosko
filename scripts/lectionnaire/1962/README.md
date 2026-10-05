# Lectionnaire 1962

Source : Divinum Officium (licence MIT) ; calendrier et préséance de 1962 calculés par Missale Meum (licence MIT, https://github.com/mmolenda/missalemeum), qui embarque Divinum Officium en sous-module. Seules les références sont conservées.

Relancer depuis `web-next` (Python 3.13 ou plus) :

    git clone --recursive https://github.com/mmolenda/missalemeum /tmp/missalemeum
    python3.13 -m venv /tmp/venv && /tmp/venv/bin/pip install -r scripts/lectionnaire/1962/requirements.txt
    /tmp/venv/bin/python scripts/lectionnaire/1962/build.py --source /tmp/missalemeum && node scripts/lectionnaire/check.mjs 1962

`titres.json` : titres français du sanctoral. `versification.json` : passages réalignés de la Vulgate vers Rahlfs.
