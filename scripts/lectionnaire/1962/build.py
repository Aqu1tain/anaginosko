#!/usr/bin/env python3
import argparse
import datetime
import json
import logging
import re
import sys
import unicodedata
from functools import lru_cache
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT_DIR = ROOT / "data" / "lectionnaire" / "1962"
SOURCE = "Divinum Officium (MIT), calendrier 1962 calculé par Missale Meum (MIT)"
YEARS = range(2025, 2031)

COLORS = {"w": "blanc", "r": "rouge", "g": "vert", "v": "violet", "b": "noir", "p": "rose"}
WEEKDAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
MASS_NAMES = {
    "12-25m1": "Messe de la nuit", "12-25m2": "Messe de l'aurore", "12-25m3": "Messe du jour",
    "11-02m1": "Première messe", "11-02m2": "Deuxième messe", "11-02m3": "Troisième messe",
}
COLOR_FIXES = {
    "06-12": "w", "06-18": "w", "06-19": "w", "07-12": "w", "07-18": "w", "07-20": "w", "08-02": "w",
    "08-28": "w", "08-30": "w", "07-23": "r", "11-14": "r", "08-09t": "v", "Pasc5-1": "w",
}
NOTES = {
    "Quad6-5r": "Pas de messe : action liturgique de la Passion",
    "Quad6-6r": "Vigile pascale, célébrée dans la nuit",
}
GOSPEL_SECTIONS = {"Evangelium", "Passio", "De lectione Evangelica"}
LESSON_LISTS = {"Lectiones", "De lectionibus"}
READING_SECTIONS = GOSPEL_SECTIONS | LESSON_LISTS | {"Lectio"} | {f"LectioL{i}" for i in range(1, 6)}

BOOKS = {
    "gen": "gen", "exod": "exo", "exodus": "exo", "lev": "lev", "levit": "lev", "num": "num", "deut": "deu",
    "jos": "jos", "judic": "jdg", "ruth": "rut", "1reg": "1sa", "2reg": "2sa", "3reg": "1ki", "4reg": "2ki",
    "1par": "1ch", "2par": "2ch", "esdr": "esd", "1esdr": "esd", "2esdr": "neh", "neh": "neh", "tob": "tob",
    "judith": "jdt", "esth": "est", "job": "job", "prov": "pro", "eccl": "ecc", "cant": "sng", "sap": "wis",
    "eccli": "sir", "is": "isa", "isa": "isa", "jer": "jer", "lam": "lam", "bar": "bar", "ezech": "ezk",
    "dan": "dan", "osee": "hos", "joel": "jol", "amos": "amo", "abd": "oba", "jon": "jon", "jonae": "jon",
    "mich": "mic", "nah": "nam", "hab": "hab", "soph": "zep", "agg": "hag", "zach": "zec", "mal": "mal",
    "malach": "mal", "1mach": "1ma", "2mach": "2ma",
}
NT_BOOKS = {
    "matt": "mt", "marc": "mk", "luc": "lk", "joann": "jn", "joannes": "jn", "joannnes": "jn", "joh": "jn",
    "act": "ac", "acts": "ac", "rom": "ro", "1cor": "1co", "2cor": "2co", "gal": "ga", "eph": "eph",
    "ephes": "eph", "phil": "php", "philipp": "php", "col": "col", "1thess": "1th", "2thess": "2th",
    "1tim": "1ti", "2tim": "2ti", "tit": "tit", "philem": "phm", "heb": "heb", "hebr": "heb", "jac": "jas",
    "jas": "jas", "1pet": "1pe", "1petri": "1pe", "2pet": "2pe", "2petri": "2pe", "1joann": "1jn",
    "1joannes": "1jn", "1joannnes": "1jn", "1john": "1jn", "2joann": "2jn", "3joann": "3jn", "jud": "jud",
    "judae": "jud", "apoc": "re",
}
TYPOS = {("jn", 21, 15, 10): (21, 15, 19)}
CORPUS_OF = {**{v: "lxx" for v in BOOKS.values()}, **{v: "nt" for v in NT_BOOKS.values()}, "sus": "lxx", "bel": "lxx"}

TOKEN = re.compile(r"^(?:(\d+):)?(\d+)[a-c]?(?:-(?:(\d+):)?(\d+)[a-c]?)?$")
OPEN = 999
LESSON_MARK = re.compile(r"^\*?Lectio (prima|secunda|tertia|quarta)\b")


def ordinal(n, feminine=False):
    if n == 1:
        return "1re" if feminine else "1er"
    return f"{n}e"


def normalize(text):
    text = text.replace("æ", "ae").replace("Æ", "Ae").replace("œ", "oe")
    text = unicodedata.normalize("NFD", text)
    return re.sub(r"[\u0300-\u036f.\s]", "", text).lower()


@lru_cache(maxsize=None)
def book_names():
    names = {}
    for corpus in ("nt", "lxx"):
        for book in json.loads((ROOT / "public" / corpus / "books.json").read_text())["books"]:
            names[book["id"]] = book["name"]
    return names


@lru_cache(maxsize=None)
def corpus_verses(corpus, book, chapter):
    path = ROOT / "public" / corpus / book / f"{chapter}.json"
    if not path.exists():
        return frozenset()
    return frozenset(m["verse"] for m in json.loads(path.read_text())["mots"])


@lru_cache(maxsize=None)
def overrides():
    data = json.loads((HERE / "versification.json").read_text())
    return {k: [parse_short(s) for s in v] for k, v in data.items() if not k.startswith("_")}


def parse_short(text):
    book, rest = text.split(" ")
    chapter, verses = rest.split(":")
    start, end = verses.split("-")
    return book, int(chapter), int(start), int(end)


def parse_ref(text):
    match = re.match(r"^((?:[1-4]\.?\s*)?[^\W\d_]+)\.?\s+(\d.*)$", text.strip())
    if not match:
        return None
    key = normalize(match[1])
    book = BOOKS.get(key) or NT_BOOKS.get(key)
    if not book:
        return None
    segments = parse_ranges(match[2])
    if not segments:
        return None
    segments = [TYPOS.get((book, *segment), segment) for segment in close_ranges(book, segments)]
    for chapter, start, end in segments:
        if end < start:
            print(f"plage inversée : {text}", file=sys.stderr)
    return book, merge(segments)


def parse_ranges(text):
    segments, chapter = [], None
    for part in re.split(r"\s*;\s*", text.strip(" .")):
        part = part.strip(" .")
        if ":" not in part:
            head = re.match(r"^(\d+)\s*[,.]\s*(\d.*)$", part)
            if head and (chapter is None or re.match(r"^\d+,\s", part)):
                part = f"{head[1]}:{head[2]}"
        for token in re.split(r"\s*,\s*|\s+et\s+|\s+", part):
            token = token.strip(" .")
            if not token:
                continue
            match = TOKEN.match(token)
            if not match:
                return None
            chapter = int(match[1]) if match[1] else chapter
            if chapter is None:
                return None
            start = int(match[2])
            if match[3]:
                segments.append((chapter, start, OPEN))
                chapter = int(match[3])
                segments.append((chapter, 1, int(match[4])))
                continue
            segments.append((chapter, start, int(match[4]) if match[4] else start))
    return segments


def merge(segments):
    merged = []
    for chapter, start, end in segments:
        if merged and merged[-1][0] == chapter and merged[-1][2] + 1 >= start:
            merged[-1] = (chapter, merged[-1][1], max(end, merged[-1][2]))
            continue
        merged.append((chapter, start, end))
    return merged


def display_ref(book, segments):
    groups = []
    for chapter, start, end in segments:
        verses = str(start) if start == end else f"{start}-{end}"
        if groups and groups[-1][0] == chapter:
            groups[-1][1].append(verses)
            continue
        groups.append((chapter, [verses]))
    text = " ; ".join(f"{chapter}, {'.'.join(verses)}" for chapter, verses in groups)
    return f"{book_names()[book]} {text}"


def close_ranges(book, segments):
    closed = []
    for chapter, start, end in segments:
        if end == OPEN:
            target, target_chapter, _, _ = shift(book, chapter, start, end)
            end = max(corpus_verses(CORPUS_OF[target], target, target_chapter), default=start)
        closed.append((chapter, start, end))
    return closed


def shift(book, chapter, start, end):
    if book == "dan" and chapter in (13, 14):
        return "sus" if chapter == 13 else "bel", 1, start, end
    if book == "jol" and chapter == 2 and start >= 28:
        return book, 3, start - 27, end - 27
    if book == "jol" and chapter == 3:
        return book, 4, start, end
    if book == "mal" and chapter == 4:
        return book, 3, start + 18, end + 18
    if book == "jer" and chapter >= 25:
        sys.exit(f"Jérémie {chapter} : ordre grec à aligner dans versification.json")
    return book, chapter, start, end


def runs(corpus, book, chapter, start, end):
    verses = corpus_verses(corpus, book, chapter)
    found, current = [], None
    for verse in range(start, end + 1):
        if verse not in verses:
            current = None
            continue
        if current:
            current[1] = verse
            continue
        current = [verse, verse]
        found.append(current)
    return found


def passages(book, segments):
    key = f"{book} " + ",".join(f"{c}:{s}-{e}" for c, s, e in segments)
    targets = overrides().get(key) or [shift(book, *segment) for segment in segments]
    if book == "sir" and key not in overrides():
        print(f"à vérifier : {key}", file=sys.stderr)
    result = []
    for target_book, chapter, start, end in targets:
        corpus = CORPUS_OF[target_book]
        found = runs(corpus, target_book, chapter, start, end)
        if not found:
            result.append({"corpus": corpus, "book": target_book, "chapter": chapter, "from": start, "to": end,
                           "absent": True})
            continue
        result += [{"corpus": corpus, "book": target_book, "chapter": chapter, "from": a, "to": b} for a, b in found]
    return result


def ref_in(line):
    match = re.match(r"^[*!]\s*(.+?)\s*\*?$", line.strip())
    return parse_ref(match[1]) if match else None


def section_refs(section_id, lines):
    if section_id not in LESSON_LISTS:
        first = next(filter(None, map(ref_in, lines)), None)
        return [first] if first else []
    found, waiting = [], False
    for line in lines:
        if LESSON_MARK.match(line.strip()):
            waiting = True
            continue
        ref = waiting and ref_in(line)
        if ref:
            found.append(ref)
            waiting = False
    return found


def reading(section_id, lines, ref):
    book, segments = ref
    item = {"ref": display_ref(book, segments), "passages": passages(book, segments)}
    if section_id in GOSPEL_SECTIONS:
        return {"kind": "evangile", "label": gospel_label(section_id, lines), **item}
    kind = "epitre" if CORPUS_OF[book] == "nt" else "lecture"
    label = "Épître" if kind == "epitre" and section_id == "Lectio" else "Leçon"
    return {"kind": kind, "label": label, **item}


def gospel_label(section_id, lines):
    if section_id == "Passio" or any(re.match(r"^P[aá]ssio", line) for line in lines):
        return "Passion"
    if section_id == "De lectione Evangelica":
        return "Évangile de la procession"
    return "Évangile"


def readings(proper, fallback):
    result = []
    for section in proper.serialize():
        section_id = section["id"]
        if section_id not in READING_SECTIONS:
            continue
        lines = section["body"].split("\n")
        if lines and lines[0].startswith("@"):
            lines = fallback(section_id)
        result += [reading(section_id, lines, ref) for ref in section_refs(section_id, lines)]
    return result


class DivinumOfficium:
    def __init__(self, root):
        self.root = root / "web" / "www"

    def sections(self, path):
        if not path.exists():
            return {}
        sections, name = {}, None
        for line in path.read_text().splitlines():
            header = re.match(r"^\[([^\]]+)\]\s*$", line.strip())
            if header:
                name = header[1]
                sections[name] = []
                continue
            if name:
                sections[name].append(line.strip())
        return sections

    def file(self, partial):
        for tree in ("missa", "horas"):
            path = self.root / tree / "Latin" / f"{partial}.txt"
            if path.exists():
                return self.sections(path)
        return {}

    def section(self, partial, name, depth=0):
        sections = self.file(partial)
        lines = sections.get(name)
        if lines and lines[0].startswith("@") and depth < 5:
            target, _, other = lines[0][1:].partition(":")
            return self.section(target, other or name, depth + 1)
        if lines:
            return lines
        rule = " ".join(sections.get("Rule", []) + sections.get("Rank", []))
        vide = re.search(r"(?:vide|ex) (C[\w-]+)", rule)
        return self.section(f"Commune/{vide[1]}", name, depth + 1) if vide and depth < 5 else []


def obs_parts(obs_id):
    flexibility, name, rank, color = obs_id.split(":")
    return flexibility, name, int(rank), color


def tempora_title(name, date):
    special = {
        "Epi1-0": "Sainte Famille de Jésus, Marie et Joseph", "Epi1-0a": "1er dimanche après l'Épiphanie",
        "Nat1-0": "Dimanche dans l'octave de Noël", "Nat2-0": "Très Saint Nom de Jésus",
        "Pent01-0r": "Très Sainte Trinité", "Pent01-0a": "1er dimanche après la Pentecôte",
        "Pent01-4": "Fête du Très Saint Sacrement", "Pent02-5": "Sacré-Cœur de Jésus",
        "Quadp3-3": "Mercredi des Cendres", "Quad5-0": "1er dimanche de la Passion",
        "Pasc0-0": "Dimanche de Pâques", "Pasc1-0": "Dimanche de Quasimodo", "Pasc5-3": "Vigile de l'Ascension",
        "Pasc5-4": "Ascension de Notre-Seigneur", "Pasc6-0": "Dimanche après l'Ascension",
        "Pasc6-6": "Vigile de la Pentecôte", "Pasc7-0": "Dimanche de la Pentecôte",
        "Pent24-0": "24e et dernier dimanche après la Pentecôte",
        "Quad5-5Feriac": "Sept Douleurs de la Bienheureuse Vierge Marie",
    }
    if name in special:
        return special[name]
    if name.startswith("093-"):
        return f"{WEEKDAYS[int(name[4])]} des Quatre-Temps de septembre"
    match = re.match(r"^(Adv|Nat|Epi|Quadp|Quad|Pasc|Pent)(\d+)-(\d)", name)
    season, week, day = match[1], int(match[2]), int(match[3])
    return SEASONS[season](week, day, date)


def advent(week, day, date):
    if day == 0:
        return f"{ordinal(week)} dimanche de l'Avent"
    if week == 3 and day in (3, 5, 6):
        return f"{WEEKDAYS[day]} des Quatre-Temps de l'Avent"
    return f"{WEEKDAYS[day]} de la {ordinal(week, True)} semaine de l'Avent"


def nativity(week, day, date):
    return f"{date.day - 24}e jour dans l'octave de Noël"


def epiphany(week, day, date):
    resumed = " (reporté après la Pentecôte)" if date.month >= 10 else ""
    if day == 0:
        return f"{ordinal(week)} dimanche après l'Épiphanie{resumed}"
    if resumed:
        return f"{WEEKDAYS[day]} de la semaine du {ordinal(week)} dimanche après l'Épiphanie (reporté)"
    return f"{WEEKDAYS[day]} de la {ordinal(week, True)} semaine après l'Épiphanie"


def prelent(week, day, date):
    sunday = {1: "la Septuagésime", 2: "la Sexagésime", 3: "la Quinquagésime"}[week]
    if day == 0:
        return f"Dimanche de {sunday}"
    if week == 3 and day > 3:
        return f"{WEEKDAYS[day]} après les Cendres"
    return f"{WEEKDAYS[day]} de la semaine de {sunday}"


def lent(week, day, date):
    if week == 6:
        return ["Dimanche des Rameaux", "Lundi saint", "Mardi saint", "Mercredi saint", "Jeudi saint",
                "Vendredi saint", "Samedi saint"][day]
    if week == 5:
        return f"{WEEKDAYS[day]} de la semaine de la Passion"
    if day == 0:
        return f"{ordinal(week)} dimanche de Carême"
    if week == 1 and day in (3, 5, 6):
        return f"{WEEKDAYS[day]} des Quatre-Temps de Carême"
    return f"{WEEKDAYS[day]} de la {ordinal(week, True)} semaine de Carême"


def easter(week, day, date):
    if week == 0:
        return f"{WEEKDAYS[day]} dans l'octave de Pâques"
    if week == 1:
        return f"{WEEKDAYS[day]} de la semaine de Quasimodo"
    if week == 5 and day in (1, 2):
        return f"{WEEKDAYS[day]} des Rogations"
    if week == 5 and day > 4:
        return f"{WEEKDAYS[day]} après l'Ascension"
    if week == 6:
        return f"{WEEKDAYS[day]} de la semaine après l'Ascension"
    if week == 7 and day in (3, 5, 6):
        return f"{WEEKDAYS[day]} des Quatre-Temps de Pentecôte"
    if week == 7:
        return f"{WEEKDAYS[day]} dans l'octave de la Pentecôte"
    if day == 0:
        return f"{ordinal(week)} dimanche après Pâques"
    return f"{WEEKDAYS[day]} de la {ordinal(week, True)} semaine après Pâques"


def pentecost(week, day, date):
    if day == 0:
        return f"{ordinal(week)} dimanche après la Pentecôte"
    return f"{WEEKDAYS[day]} de la {ordinal(week, True)} semaine après la Pentecôte"


SEASONS = {"Adv": advent, "Nat": nativity, "Epi": epiphany, "Quadp": prelent, "Quad": lent, "Pasc": easter,
           "Pent": pentecost}


class Titles:
    def __init__(self, latin):
        self.french = json.loads((HERE / "titres.json").read_text())
        self.latin = latin

    def of(self, obs, date):
        flexibility, name, _, _ = obs_parts(obs.id)
        if flexibility == "tempora":
            return tempora_title(name, date)
        if flexibility == "commune":
            return "Sainte Marie le samedi"
        if flexibility == "sancti":
            return self.french.get(name) or self.latin.get(obs.id) or obs.title
        return "Férie"


def nature(obs, title):
    flexibility, name, _, _ = obs_parts(obs.id)
    if flexibility == "sancti" and name.startswith("11-02"):
        return "Jour"
    if flexibility == "sancti":
        return "Vigile" if title.startswith("Vigile") else "Fête"
    if name in ("Epi1-0", "Nat2-0", "Pent01-0r", "Pent01-4", "Pent02-5", "Pasc5-4"):
        return "Fête"
    if name in ("Pasc5-3", "Pasc6-6"):
        return "Vigile"
    if re.match(r"^.*-0", name):
        return "Dimanche"
    if re.match(r"^(Pasc0|Pasc7|Nat1)-", name):
        return "Octave"
    return "Férie"


def is_feria(obs):
    flexibility, _, rank, _ = obs_parts(obs.id)
    return flexibility not in ("sancti", "commune") and (flexibility != "tempora" or rank == 4)


def feria_label(day, titles):
    if day.tempora:
        return titles.of(day.tempora[0], day.date)
    if day.date.month == 1 and day.date.day < 6:
        return "Férie du temps de Noël"
    return "Férie après l'Épiphanie"


def transferred(obs, date):
    flexibility, name, _, _ = obs_parts(obs.id)
    if flexibility != "sancti" or not re.match(r"^\d\d-\d\d", name):
        return False
    month, day = int(name[:2]), int(name[3:5])
    leap_shift = (month, day) in ((2, 24), (2, 27)) and date == datetime.date(date.year, month, day + 1)
    return (date.month, date.day) != (month, day) and not leap_shift


def describe(day, titles):
    main = day.celebration[0]
    _, name, rank, _ = obs_parts(main.id)
    parts = []
    if is_feria(main):
        title = "Férie"
        parts.append(feria_label(day, titles))
    else:
        title = titles.of(main, day.date)
        parts.append(class_label(main, title, rank))
        if transferred(main, day.date):
            parts.append("transférée")
    commemorations = [titles.of(o, day.date) for o in day.get_commemorations()]
    if commemorations:
        parts.append("Commémoraison : " + " ; ".join(commemorations))
    entry = {"title": title, "detail": " · ".join(parts), "color": color(day, main)}
    note = NOTES.get(name) or inferred_note(day, titles)
    if note:
        entry["note"] = note
    return entry


def class_label(obs, title, rank):
    if obs_parts(obs.id)[0] == "commune":
        return f"{ordinal(rank, True)} classe"
    return f"{nature(obs, title)} de {ordinal(rank, True)} classe"


def color(day, main):
    source = day.tempora[0] if is_feria(main) and day.tempora else main
    fixed = COLOR_FIXES.get(obs_parts(source.id)[1])
    if fixed:
        return COLORS[fixed]
    codes = source.colors
    return COLORS[codes[-1] if len(codes) > 1 and codes[0] in "rv" else codes[0]]


def inferred_note(day, titles):
    if all(o.has_proper() for o in day.celebration):
        return None
    source = day._infer_observance()
    return f"Messe reprise : {titles.of(source, source.date)}"


def build_day(day, titles, do):
    entry = describe(day, titles)
    masses = []
    for observance, (_, latin) in zip(day.celebration, day.get_proper()):
        flexibility, name = latin.id.split(":")[:2]
        partial = f"{flexibility.capitalize()}/{name}"
        mass = {"readings": readings(latin, lambda section: do.section(partial, section))}
        mass_name = MASS_NAMES.get(obs_parts(observance.id)[1])
        if len(day.celebration) > 1 and mass_name:
            mass = {"name": mass_name, **mass}
        masses.append(mass)
    entry["masses"] = masses
    return entry


def load_missalemeum(source):
    do_root = source / "backend" / "resources" / "divinum-officium"
    if not (do_root / "web").exists():
        sys.exit(f"Divinum Officium absent de {do_root} : cloner Missale Meum avec --recursive")
    sys.path.insert(0, str(source / "backend"))
    logging.basicConfig(level=logging.ERROR)
    from api.kalendar.factory import MissalFactory
    from api.constants.la.translation import TITLES
    return MissalFactory, TITLES, DivinumOfficium(do_root)


def build_year(year, factory, titles, do):
    calendar = factory().create(year, "la")
    days = {str(date): build_day(day, titles, do) for date, day in calendar.items()}
    return {"rite": "1962", "source": SOURCE, "days": days}


def main():
    parser = argparse.ArgumentParser(description="Lectionnaire du missel romain de 1962")
    parser.add_argument("--source", required=True, type=Path, help="clone de missalemeum (avec sous-module)")
    parser.add_argument("--out", default=OUT_DIR, type=Path)
    args = parser.parse_args()
    factory, latin_titles, do = load_missalemeum(args.source.resolve())
    titles = Titles(latin_titles)
    args.out.mkdir(parents=True, exist_ok=True)
    for year in YEARS:
        data = build_year(year, factory, titles, do)
        path = args.out / f"{year}.json"
        path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n")
        print(f"{path.relative_to(ROOT) if path.is_relative_to(ROOT) else path} : {len(data['days'])} jours")


if __name__ == "__main__":
    main()
