import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const here = path.dirname(new URL(import.meta.url).pathname);
const fixture = process.argv[2];
if (!fixture) {
  console.error("usage : node extraire.mjs <orthocal-python>/fixtures/calendarium.json");
  process.exit(1);
}

const BOOKS = [
  ["1 Thess", "1th"], ["2 Thess", "2th"], ["1 Cor", "1co"], ["2 Cor", "2co"], ["1 Tim", "1ti"], ["2 Tim", "2ti"],
  ["1 Peter", "1pe"], ["1 Pet", "1pe"], ["2 Pet", "2pe"], ["1 John", "1jn"], ["2 John", "2jn"], ["3 John", "3jn"],
  ["Matt", "mt"], ["Mark", "mk"], ["Luke", "lk"], ["John", "jn"], ["Acts", "ac"], ["Rom", "ro"], ["Gal", "ga"],
  ["Eph", "eph"], ["Phil", "php"], ["Col", "col"], ["Titus", "tit"], ["Heb", "heb"], ["Jas", "jas"], ["Jude", "jud"],
  ["Gen", "gen"], ["Exod", "exo"], ["Prov", "pro"], ["Job", "job"],
];

const MENEE = {
  "01-01": [["Circumcision", "Circoncision du Seigneur", 6], ["St Basil", "Saint Basile le Grand", 6]],
  "01-02": [["Forefeast of Theophany", "Avant-fête de la Théophanie", 2]],
  "01-04": [["Forefeast of Theophany", "Avant-fête de la Théophanie", 2]],
  "01-06": [["Theophany", "Théophanie du Seigneur", 8]],
  "01-07": [["Forerunner", "Synaxe de saint Jean-Baptiste", 3]],
  "01-08": [["Afterfeast of Theophany", "Après-fête de la Théophanie", 2]],
  "01-09": [["Afterfeast of Theophany", "Après-fête de la Théophanie", 2]],
  "01-10": [["Afterfeast of Theophany", "Après-fête de la Théophanie", 2]],
  "01-11": [["St Theodosius", "Saint Théodose le Cénobiarque", 4], ["Afterfeast of Theophany", "Après-fête de la Théophanie", 2]],
  "01-12": [["Afterfeast of Theophany", "Après-fête de la Théophanie", 2]],
  "01-13": [["Afterfeast of Theophany", "Après-fête de la Théophanie", 2]],
  "01-15": [["John the Hut-Dweller", "Saint Jean le Calybite", 2]],
  "01-16": [["Peter's Chains", "Vénération des chaînes de saint Pierre", 2]],
  "01-17": [["St Anthony", "Saint Antoine le Grand", 5]],
  "01-18": [["Athanasius & Cyril", "Saints Athanase et Cyrille d'Alexandrie", 3]],
  "01-19": [["Macarius the Great", "Saint Macaire l'Égyptien", 2]],
  "01-20": [["St. Euthymius|St Euthymius", "Saint Euthyme le Grand", 4]],
  "01-21": [["St. Maximus", "Saint Maxime le Confesseur", 2]],
  "01-22": [["St. Timothy", "Saint Timothée, apôtre", 3]],
  "01-23": [["St. Clement", "Saint Clément d'Ancyre", 2]],
  "01-24": [["Xenia of Rome", "Sainte Xénie de Rome", 2]],
  "01-25": [["St. Gregory|St Gregory", "Saint Grégoire le Théologien", 4]],
  "01-27": [["St John", "Translation des reliques de saint Jean Chrysostome", 4]],
  "01-28": [["St. Ephraim", "Saint Éphrem le Syrien", 2]],
  "01-29": [["Ignatius' Relics", "Translation des reliques de saint Ignace d'Antioche", 2]],
  "01-30": [["Hierarchs", "Synaxe des trois saints hiérarques", 5]],
  "01-31": [["Cyrus & John", "Saints Cyr et Jean, anargyres", 2]],
  "02-01": [["St. Trypho", "Saint Tryphon", 2]],
  "02-02": [["Meeting", "Rencontre du Seigneur au Temple", 8]],
  "02-03": [["Afterfeast of Presentation", "Saints Syméon le Juste et Anne la prophétesse", 2]],
  "02-08": [["St. Theodore", "Saint Théodore le Stratilate", 2]],
  "02-09": [["Meeting", "Clôture de la Rencontre du Seigneur", 3]],
  "02-10": [["St. Haralambos", "Saint Charalampe", 2]],
  "02-11": [["Blaise", "Saint Blaise", 2]],
  "02-17": [["Theodore Tyro", "Saint Théodore le Conscrit", 2]],
  "02-24": [["Forerunner", "Première et deuxième inventions du chef de saint Jean-Baptiste", 4]],
  "03-09": [["Martyrs", "Saints quarante martyrs de Sébaste", 4]],
  "03-25": [["Annunciation", "Annonciation de la Mère de Dieu", 7, 1033]],
  "03-26": [["Theotokos", "Synaxe de l'archange Gabriel", 3]],
  "04-23": [["St George", "Saint Georges, grand martyr", 5]],
  "04-25": [["St Mark", "Saint Marc, apôtre et évangéliste", 4]],
  "04-30": [["St James", "Saint Jacques, fils de Zébédée, apôtre", 4]],
  "05-02": [["Removal of Relics of Athanasius", "Translation des reliques de saint Athanase le Grand", 2]],
  "05-07": [["Appearance of the Cross over Jerusalem", "Apparition de la Croix dans le ciel de Jérusalem", 2]],
  "05-08": [["St John", "Saint Jean le Théologien, apôtre et évangéliste", 5]],
  "05-10": [["St Simeon", "Saint Simon le Zélote, apôtre", 4]],
  "05-11": [["Saints", "Saints Cyrille et Méthode, égaux aux apôtres", 2]],
  "05-21": [["Saints", "Saints Constantin et Hélène, égaux aux apôtres", 4]],
  "05-25": [["Forerunner", "Troisième invention du chef de saint Jean-Baptiste", 4]],
  "06-04": [["Metrophanes", "Saint Métrophane de Constantinople", 2]],
  "06-08": [["Removal of Relics of Theodore", "Translation des reliques de saint Théodore le Stratilate", 2]],
  "06-11": [["Apostles", "Saints Barthélemy et Barnabé, apôtres", 4]],
  "06-19": [["St Jude", "Saint Jude, apôtre", 4]],
  "06-24": [["Forerunner", "Nativité de saint Jean-Baptiste", 6]],
  "06-29": [["Apostles", "Saints Pierre et Paul, apôtres", 6]],
  "06-30": [["Synaxis of the Twelve Apostles", "Synaxe des douze apôtres", 4]],
  "07-01": [["Cosmas & Damian", "Saints Côme et Damien de Rome", 2]],
  "07-02": [["Deposition of the Robe", "Déposition de la robe de la Mère de Dieu", 3]],
  "07-05": [["Athanasius of Mount Athos", "Saint Athanase l'Athonite", 2]],
  "07-07": [["Kyriake", "Sainte Kyriaki", 2]],
  "07-08": [["Procopius", "Saint Procope", 2]],
  "07-11": [["Euphemia (July)", "Sainte Euphémie, miracle du concile de Chalcédoine", 2]],
  "07-13": [["Synaxis of Archangel Gabriel", "Synaxe de l'archange Gabriel", 2]],
  "07-14": [["Apostle Aquila of the 70", "Saint Aquilas, apôtre", 2]],
  "07-15": [["Cyricus & Julitta", "Saints Cyr et Julitte", 2]],
  "07-17": [["Marina", "Sainte Marina", 3]],
  "07-20": [["Prophet Elijah", "Saint Élie, prophète", 5]],
  "07-22": [["Mary Magdalene", "Sainte Marie-Madeleine, myrophore", 3]],
  "07-25": [["St Anna", "Dormition de sainte Anne", 3]],
  "07-26": [["Paraskeve", "Sainte Parascève", 2]],
  "07-27": [["St Panteleimon", "Saint Pantéléimon", 3]],
  "07-28": [["Apostles Prochorus, Nicanor, Timon, Parmenas", "Saints Prochore, Nicanor, Timon et Parménas, diacres", 2]],
  "07-30": [["Apostles Silas & Silvanus", "Saints Silas et Silvain, apôtres", 2]],
  "08-01": [["Cross", "Procession de la précieuse Croix", 3], ["Holy Maccabee Children", "Saints martyrs Maccabées", 3]],
  "08-05": [["Martyr Eusignius", "Saint Eusigne", 2]],
  "08-06": [["Transfiguration", "Transfiguration du Seigneur", 8]],
  "08-07": [["Afterfeast of Transfiguration", "Après-fête de la Transfiguration", 2]],
  "08-15": [["Dormition", "Dormition de la Mère de Dieu", 7]],
  "08-16": [["Image", "Translation de l'icône du Christ non faite de main d'homme", 3]],
  "08-21": [["Thaddaeus", "Saint Thaddée, apôtre", 2]],
  "08-23": [["Theotokos", "Clôture de la Dormition", 3]],
  "08-25": [["Bartholomew relics", "Translation des reliques de saint Barthélemy ; saint Tite", 2]],
  "08-26": [["Adrian & Natalia", "Saints Adrien et Natalie", 2]],
  "08-29": [["Forerunner", "Décollation de saint Jean-Baptiste", 6]],
  "08-31": [["Placing of the Sash of the Theotokos", "Déposition de la ceinture de la Mère de Dieu", 3]],
  "09-01": [["New Year", "Commencement de l'année liturgique (Indiction)", 4], ["St Simeon", "Saint Syméon le Stylite", 3]],
  "09-05": [["Zacharias", "Saint Zacharie, père du Précurseur", 2]],
  "09-08": [["Theotokos", "Nativité de la Mère de Dieu", 7]],
  "09-09": [["Joachim & Anna", "Saints Joachim et Anne", 3]],
  "09-10": [["Menodora, Metrodora, Nymphodora", "Saintes Ménodore, Métrodore et Nymphodore", 2]],
  "09-11": [["Theodora of Alexandria", "Sainte Théodora d'Alexandrie", 2]],
  "09-12": [["Theotokos", "Clôture de la Nativité de la Mère de Dieu", 3]],
  "09-13": [["Church", "Dédicace de la basilique de la Résurrection à Jérusalem", 3]],
  "09-14": [["Elevation", "Exaltation de la Croix", 8]],
  "09-15": [["Nikitas", "Saint Nicétas", 2]],
  "09-16": [["Euphemia (September)", "Sainte Euphémie", 2]],
  "09-23": [["Forerunner", "Conception de saint Jean-Baptiste", 3]],
  "09-26": [["St John", "Dormition de saint Jean le Théologien", 5]],
  "09-28": [["St Chariton", "Saint Chariton le Confesseur", 2]],
  "09-29": [["Cyriacos", "Saint Cyriaque l'Anachorète", 2]],
  "09-30": [["Hieromartyr Gregory of Armenia", "Saint Grégoire l'Illuminateur", 3]],
  "10-01": [["Ananias of the Seventy", "Saint Ananie, apôtre", 2]],
  "10-02": [["Cyprian", "Saints Cyprien et Justine", 2]],
  "10-03": [["Dionysius the Areopagite", "Saint Denys l'Aréopagite", 2]],
  "10-06": [["Thomas the Apostle", "Saint Thomas, apôtre", 4]],
  "10-09": [["James, Son of Alphaeus", "Saint Jacques, fils d'Alphée, apôtre", 4]],
  "10-16": [["Longinus the Centurion", "Saint Longin le Centurion", 2]],
  "10-17": [["Prophet Hosea", "Saint Osée, prophète", 2]],
  "10-18": [["St Luke", "Saint Luc, apôtre et évangéliste", 4]],
  "10-19": [["Prophet Joel", "Saint Joël, prophète", 2]],
  "10-20": [["Artemius", "Saint Artème", 2]],
  "10-21": [["Hilarion the Great", "Saint Hilarion le Grand", 2]],
  "10-23": [["St James", "Saint Jacques, frère du Seigneur, apôtre", 4]],
  "10-26": [["St Demetrius", "Saint Démétrios, grand martyr", 5]],
  "10-31": [["Apostles Stachys, Amplias, et al", "Saints Stachys, Amplias et leurs compagnons, apôtres", 2]],
  "11-01": [["Cosmas & Damian", "Saints Côme et Damien, anargyres", 3]],
  "11-06": [["Paul the Confessor", "Saint Paul le Confesseur", 2]],
  "11-08": [["Angels", "Synaxe des archanges Michel et Gabriel", 5]],
  "11-10": [["Apostles of the 70", "Saints Éraste, Olympas, Hérodion et leurs compagnons, apôtres", 2]],
  "11-11": [["Menas, Victor & Vincent", "Saints Ménas, Victor et Vincent", 2]],
  "11-12": [["John the Merciful", "Saint Jean l'Aumônier", 2]],
  "11-13": [["St John Chrysostom", "Saint Jean Chrysostome", 5]],
  "11-14": [["St Philip", "Saint Philippe, apôtre", 4]],
  "11-16": [["Matthew the Apostle", "Saint Matthieu, apôtre et évangéliste", 4]],
  "11-17": [["Gregory the Wonderworker", "Saint Grégoire le Thaumaturge", 2]],
  "11-21": [["Entrance", "Entrée de la Mère de Dieu au Temple", 7]],
  "11-24": [["Hieromartyrs Clement & Peter", "Saints Clément de Rome et Pierre d'Alexandrie", 2]],
  "11-25": [["Theotokos", "Clôture de l'Entrée de la Mère de Dieu au Temple", 3], ["Catherine", "Sainte Catherine d'Alexandrie", 3]],
  "11-30": [["St Andrew", "Saint André, apôtre", 5]],
  "12-04": [["Barbara", "Sainte Barbe", 2]],
  "12-05": [["St Sabbas|St Sabas", "Saint Sabbas le Sanctifié", 4]],
  "12-06": [["St Nicholas", "Saint Nicolas de Myre", 5]],
  "12-09": [["St Anna", "Conception de la Mère de Dieu par sainte Anne", 3]],
  "12-12": [["Spyridon", "Saint Spyridon de Trimythonte", 2]],
  "12-15": [["Eleutherios", "Saint Éleuthère", 2]],
  "12-17": [["Daniel and the Three Youths", "Saint Daniel, prophète, et les trois saints jeunes gens", 2]],
  "12-25": [["Nativity", "Nativité du Christ", 8]],
  "12-26": [["Theotokos", "Synaxe de la Mère de Dieu", 3]],
  "12-27": [["St Stephen", "Saint Étienne, premier martyr", 3]],
  "12-28": [["Nicomedia Martyrs", "Saints martyrs de Nicomédie", 2]],
  "12-29": [["Holy Innocents", "Saints Innocents", 2]],
};

const FLOTTANTES = {
  1001: ["Dimanche des saints Pères des six premiers conciles œcuméniques", ["Fathers"]],
  1002: ["Dimanche des saints Pères du VIIe concile œcuménique", ["Fathers"]],
  1005: ["Samedi avant l'Exaltation de la Croix", ["Saturday before Elevation"]],
  1006: ["Samedi avant l'Exaltation de la Croix", ["Saturday before Elevation"]],
  1007: ["Dimanche avant l'Exaltation de la Croix", ["Sunday before Elevation"]],
  1008: ["Samedi après l'Exaltation de la Croix", ["Saturday after Elevation"]],
  1009: ["Dimanche après l'Exaltation de la Croix", ["Sunday after Elevation"]],
  1010: ["Dimanche des saints Ancêtres du Christ", ["Forefathers"]],
  1011: ["Samedi avant la Nativité du Christ", ["Saturday before Nativity"]],
  1012: ["Dimanche avant la Nativité du Christ, des saints Pères", ["Sunday before Nativity"]],
  1013: ["Grandes Heures royales de la Nativité", []],
  1014: ["Veille de la Nativité du Christ", ["Eve of Nativity"]],
  1015: ["Samedi avant la Nativité, veille de la Nativité", ["Saturday before Nativity"]],
  1016: ["Dimanche avant la Nativité, veille de la Nativité", ["Sunday before Nativity"]],
  1017: ["Samedi après la Nativité et avant la Théophanie", ["Saturday after Nativity", "Saturday before Theophany"], ["Samedi après la Nativité du Christ", "Samedi avant la Théophanie"]],
  1018: ["Samedi après la Nativité du Christ", ["Saturday after Nativity"]],
  1019: ["Samedi après la Nativité du Christ", ["Saturday after Nativity"]],
  1020: ["Lectures du dimanche après la Nativité", ["Sunday after Nativity|Sunday after Nativity and Theotokos"]],
  1021: ["Dimanche après la Nativité du Christ", ["Sunday after Nativity|Sunday after Nativity and Theotokos"]],
  1022: ["Samedi avant la Théophanie", ["Saturday before Theophany"]],
  1023: ["Lectures du dimanche avant la Théophanie", ["Sunday before Theophany"]],
  1024: ["Dimanche avant la Théophanie", ["Sunday before Theophany"]],
  1025: ["Grandes Heures royales de la Théophanie", []],
  1026: ["Veille de la Théophanie", ["Eve of Theophany"]],
  1027: ["Samedi avant la Théophanie, veille de la Théophanie", ["Saturday before Theophany"]],
  1028: ["Dimanche avant la Théophanie, veille de la Théophanie", ["Sunday before Theophany"]],
  1029: ["Samedi après la Théophanie", ["Saturday after Theophany"]],
  1030: ["Dimanche après la Théophanie", ["Sunday after Theophany"]],
  1038: ["Clôture de la Théophanie", ["Leavetaking of Theophany"]],
};

const CYCLE_SETS = {
  "": { role: "jour" },
  Departed: { role: "defunts", nom: "Pour les défunts" },
  Presanctified: { role: "jour" },
  Composite: { role: "jour" },
  "St Theodore": { role: "fete", nom: "Saint Théodore le Conscrit" },
  "St John": { role: "fete", nom: "Saint Jean Climaque" },
  "St Mary": { role: "fete", nom: "Sainte Marie l'Égyptienne" },
  Theotokos: { role: "fete", nom: "Mère de Dieu" },
};
const CYCLE_FETE_NOMS = { "-15": "Acathiste de la Mère de Dieu", 5: "Source vivifiante de la Mère de Dieu" };
const CYCLE_DEFUNTS_NOMS = { "-50": "Saints moines et ascètes" };

function toRef(display) {
  const text = display.replace(/\s*\(LXX\)/g, "").replace(/:/g, ".").trim();
  const parts = text.split(/\s*;\s*/).map((part) => {
    const book = BOOKS.find(([name]) => part.startsWith(name + " "));
    return book ? `${book[1]} ${part.slice(book[0].length + 1)}` : part;
  });
  if (!BOOKS.some(([name]) => text.startsWith(name + " "))) throw new Error(`livre inconnu : ${display}`);
  return parts.join("; ");
}

const data = JSON.parse(readFileSync(fixture, "utf8"));
const pericopes = new Map(data.filter((x) => x.model === "calendarium.pericope").map((x) => [x.pk, x.fields]));
const readings = data
  .filter((x) => x.model === "calendarium.reading" && x.fields.tradition !== "slavic")
  .map((x) => ({ ...x.fields, display: pericopes.get(x.fields.pericope).sdisplay }));

function preferGreek(rows) {
  const kept = new Map();
  for (const row of rows) {
    const slot = [row.pdist, row.month, row.day, row.source, row.ordering, row.desc].join("|");
    if (!kept.has(slot) || row.tradition === "greek") kept.set(slot, row);
  }
  return [...kept.values()].sort((a, b) => a.ordering - b.ordering);
}

const scriptural = (row) => (row.source === "Epistle" || row.source === "Gospel") && row.ordering < 1000;
const liturgical = (row) => scriptural(row) && row.ordering >= 800;
const slotOf = (row) => (row.source === "Epistle" ? "apotre" : "evangile");

function setsFrom(rows, keyOf) {
  const sets = new Map();
  for (const row of rows) {
    const key = keyOf(row);
    if (key === null) continue;
    if (!sets.has(key)) sets.set(key, { ordre: row.ordering % 100 });
    const set = sets.get(key);
    const slot = slotOf(row);
    if (!set[slot]) set[slot] = toRef(row.display);
  }
  return sets;
}

function buildCycle() {
  const cycle = {};
  const rows = preferGreek(readings.filter((r) => r.month === 0 && r.pdist >= -133 && r.pdist < 700));
  const byPdist = Map.groupBy(rows, (r) => r.pdist);
  for (const [pdist, list] of [...byPdist].sort((a, b) => a[0] - b[0])) {
    const entry = {};
    const sets = setsFrom(list.filter(liturgical), (r) => (r.desc in CYCLE_SETS ? r.desc : null));
    for (const [desc, set] of sets) {
      const { role, nom } = CYCLE_SETS[desc];
      const { ordre, ...refs } = set;
      if (role === "jour") Object.assign(entry, refs);
      else (entry.autres ??= []).push({ role, nom: nomCycle(role, pdist, nom), ordre, ...refs });
    }
    const vespers = list.filter((r) => r.source === "Vespers" && /^(Gen|Prov|Exod|Job) /.test(r.display) && pdist >= -48 && pdist <= -4);
    if (vespers.length) entry.lectures = vespers.map((r) => toRef(r.display));
    if (Object.keys(entry).length) cycle[pdist] = entry;
  }
  return cycle;
}

function nomCycle(role, pdist, nom) {
  if (role === "fete") return CYCLE_FETE_NOMS[pdist] ?? nom;
  return CYCLE_DEFUNTS_NOMS[pdist] ?? nom;
}

const matches = (pattern, desc) => pattern.split("|").includes(desc);

function buildMenee() {
  const menee = {};
  const rows = preferGreek(readings.filter((r) => r.month > 0 && liturgical(r)));
  const floats = preferGreek(readings.filter((r) => r.month === 0 && r.pdist > 1000 && liturgical(r)));
  for (const [date, entries] of Object.entries(MENEE)) {
    const [month, day] = date.split("-").map(Number);
    menee[date] = entries.map(([desc, nom, rang, floatIndex]) => {
      const source = floatIndex ? floats.filter((r) => r.pdist === floatIndex) : rows.filter((r) => r.month === month && r.day === day);
      const set = { nom, rang };
      for (const row of source.filter((r) => matches(desc, r.desc))) set[slotOf(row)] ??= toRef(row.display);
      if (!set.apotre && !set.evangile) throw new Error(`aucune lecture pour ${date} ${desc}`);
      return set;
    });
  }
  return menee;
}

function buildFlottantes() {
  const result = {};
  const rows = preferGreek(readings.filter((r) => r.month === 0 && r.pdist > 1000 && scriptural(r)));
  for (const [index, [nom, descs, noms]] of Object.entries(FLOTTANTES)) {
    const list = rows.filter((r) => r.pdist === Number(index));
    const sets = descs.map((desc, i) => {
      const set = noms ? { nom: noms[i] } : {};
      for (const row of list.filter((r) => matches(desc, r.desc) && !/Vespers/.test(r.desc))) set[slotOf(row)] ??= toRef(row.display);
      return set;
    });
    result[index] = { nom, sets: sets.filter((s) => s.apotre || s.evangile) };
  }
  return result;
}

const write = (name, value) => writeFileSync(path.join(here, "tables", name), JSON.stringify(value, null, 1) + "\n");
write("cycle.json", buildCycle());
write("menee.json", buildMenee());
write("flottantes.json", buildFlottantes());
console.log("tables écrites dans", path.join(here, "tables"));
