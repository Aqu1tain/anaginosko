import Link from "next/link";
import { creditName } from "@/src/data/translators";
import {
  RITES,
  addDays,
  daysWithReadings,
  formatLongDate,
  loadDay,
  resolveReading,
  riteRange,
  todayInParis,
  weekOf,
  type Mass,
  type Reading,
  type ResolvedPassage,
  type ResolvedReading,
  type Rite,
} from "@/lib/lectionnaire";
import Choice from "./Choice";
import DateJump from "./DateJump";
import ReportButton from "@/src/components/ReportButton";
import PassageGreek from "./PassageGreek";

const COLORS: Record<string, string> = {
  vert: "#3a7d44",
  violet: "#6d3fa6",
  blanc: "#f4f1e6",
  rouge: "#c62828",
  rose: "#e58fb0",
  noir: "#1f1f1f",
  or: "#c9a227",
};

const BASE_TRANSLATOR = { nt: "Sainte Bible néo-Crampon Libre", lxx: "Pierre Giguet" };

const shortDay = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" });
const dayNumber = (iso: string) => Number(iso.slice(8));

// Le jour courant a son adresse stable (« /lectures », « /lectures/byzantin ») ;
// les autres jours ont une adresse datée.
export const lecturesHref = (rite: Rite, iso: string, today: string) =>
  iso !== today ? `/lectures/${rite.slug}/${iso}` : rite.slug === "ordinaire" ? "/lectures" : `/lectures/${rite.slug}`;

const chapterHref = (p: ResolvedPassage) => `/${p.corpus}/${p.book}/${p.chapter}#v${p.from}`;

// Une lecture et ses autres formes (« ou bien », forme brève) forment un groupe.
function groupReadings(readings: Reading[]) {
  const groups: Reading[][] = [];
  for (const r of readings) {
    if (r.alternative && groups.length) groups[groups.length - 1].push(r);
    else groups.push([r]);
  }
  return groups;
}

function translators(r: ResolvedReading) {
  const names = new Set<string>();
  for (const p of r.resolved) {
    if (!p.french || p.frenchBlock) continue;
    for (const v of p.verses) {
      if (!(v in p.french)) continue;
      names.add(creditName(p.maison?.[v] ?? BASE_TRANSLATOR[p.corpus]));
    }
  }
  return [...names].join(", ");
}

function PassageText({ p }: { p: ResolvedPassage }) {
  if (p.absent || !p.text) {
    return (
      <p className="py-3 text-base-content/70">
        {p.corpus === "lxx"
          ? "Ce passage ne figure pas dans la Septante."
          : "Ce passage ne figure pas dans le texte grec critique (SBLGNT)."}
      </p>
    );
  }
  return (
    <div>
      <PassageGreek text={p.text} verses={p.verses} french={p.frenchBlock ? null : p.french} />
      {p.frenchBlock && (
        <p className="pt-2 text-sm text-base-content/70">
          La traduction de Giguet suit ici une autre numérotation :{" "}
          <Link href={chapterHref(p)} className="link">
            lire le chapitre entier
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function ReadingBody({ r }: { r: ResolvedReading }) {
  const credit = translators(r);
  const first = r.resolved.find((p) => !p.absent);
  return (
    <div className="mt-4">
      {r.resolved.map((p, idx) => (
        <PassageText key={idx} p={p} />
      ))}
      <p className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-base-content/65">
        {credit && <span>Traduction : {credit}</span>}
        {first && (
          <Link href={chapterHref(first)} className="font-medium text-primary hover:underline">
            Ouvrir le chapitre
          </Link>
        )}
      </p>
    </div>
  );
}

async function ReadingGroup({ group }: { group: Reading[] }) {
  const resolved = await Promise.all(group.map(resolveReading));
  const head = resolved[0];
  return (
    <section className="border-t border-base-300 pt-8">
      <h2 className="font-greek text-2xl font-bold leading-tight">{head.label}</h2>
      {resolved.length === 1 ? (
        <>
          <p className="mt-1 text-base-content/70">{head.ref}</p>
          <ReadingBody r={head} />
        </>
      ) : (
        <div className="mt-3">
          <Choice label={`${head.label} : au choix`} options={resolved.map((r) => r.ref)}>
            {resolved.map((r) => (
              <ReadingBody key={r.ref} r={r} />
            ))}
          </Choice>
        </div>
      )}
    </section>
  );
}

function MassReadings({ mass }: { mass: Mass }) {
  return (
    <div className="mt-8 flex flex-col gap-10">
      {groupReadings(mass.readings).map((group, idx) => (
        <ReadingGroup key={idx} group={group} />
      ))}
    </div>
  );
}

async function Week({ rite, iso, today }: { rite: Rite; iso: string; today: string }) {
  const days = weekOf(iso);
  const available = await daysWithReadings(rite, days);
  const cell = "flex flex-col items-center rounded-2xl py-2 text-sm";
  return (
    <nav aria-label="Jours de la semaine" className="flex items-center gap-1.5">
      <Link href={lecturesHref(rite, addDays(iso, -7), today)} aria-label="Semaine précédente" className="btn btn-ghost btn-circle btn-sm shrink-0">
        <span aria-hidden>‹</span>
      </Link>
      <ol className="grid min-w-0 flex-1 grid-cols-7 gap-1">
        {days.map((d) => {
          const content = (
            <>
              <span className="text-xs capitalize opacity-70">{shortDay.format(new Date(`${d}T00:00:00Z`)).replace(".", "")}</span>
              <span className="text-lg font-semibold tabular-nums">{dayNumber(d)}</span>
              <span aria-hidden className={`mt-0.5 h-1 w-1 rounded-full ${d === today ? "bg-accent" : "bg-transparent"}`} />
            </>
          );
          return (
            <li key={d}>
              {available.has(d) ? (
                <Link
                  href={lecturesHref(rite, d, today)}
                  aria-current={d === iso ? "date" : undefined}
                  aria-label={formatLongDate(d)}
                  className={`${cell} transition-colors ${d === iso ? "bg-primary text-primary-content" : "hover:bg-base-200"}`}
                >
                  {content}
                </Link>
              ) : (
                <span className={`${cell} opacity-40`}>{content}</span>
              )}
            </li>
          );
        })}
      </ol>
      <Link href={lecturesHref(rite, addDays(iso, 7), today)} aria-label="Semaine suivante" className="btn btn-ghost btn-circle btn-sm shrink-0">
        <span aria-hidden>›</span>
      </Link>
    </nav>
  );
}

export default async function LecturesView({ rite, iso }: { rite: Rite; iso: string }) {
  const today = todayInParis();
  const [day, range] = await Promise.all([loadDay(rite, iso), riteRange(rite)]);
  const masses = day?.masses ?? [];
  const initialMass = Math.max(0, masses.findIndex((m) => /messe du jour/i.test(m.name ?? "")));

  return (
    <div className="pt-6 wide:pt-10">
      <header className="flex flex-col gap-6">
        <div>
          <h1 className="font-greek text-3xl font-bold leading-tight wide:text-5xl">
            Lectures du {formatLongDate(iso).toLowerCase()}
          </h1>
          {day && (
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-lg">
              <span className="inline-flex items-center gap-2.5 font-semibold">
                {day.color && COLORS[day.color] && (
                  <span
                    role="img"
                    aria-label={`Couleur liturgique : ${day.color}`}
                    className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-base-content/20"
                    style={{ backgroundColor: COLORS[day.color] }}
                  />
                )}
                {day.title}
              </span>
              {day.detail && <span className="text-base-content/70">{day.detail}</span>}
            </p>
          )}
        </div>

        <nav aria-label="Liturgie" className="flex flex-wrap gap-2">
          {RITES.map((r) => (
            <Link
              key={r.slug}
              href={lecturesHref(r, iso, today)}
              aria-current={r.slug === rite.slug ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full px-4 text-[0.95rem] font-medium transition-colors ${
                r.slug === rite.slug ? "bg-primary text-primary-content" : "bg-base-200 hover:text-accent"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-4 rounded-box bg-base-200 p-4 wide:flex-row wide:items-end wide:gap-6 wide:p-5">
          <div className="min-w-0 flex-1">
            <Week rite={rite} iso={iso} today={today} />
          </div>
          <div className="flex items-end gap-3">
            <DateJump base={`/lectures/${rite.slug}`} value={iso} min={range?.first} max={range?.last} />
            {iso !== today && (
              <Link href={lecturesHref(rite, today, today)} className="btn btn-outline btn-primary h-11 min-h-11 rounded-full px-5">
                Aujourd’hui
              </Link>
            )}
          </div>
        </div>
      </header>

      {!day && (
        <p className="mt-10 text-lg text-base-content/75">
          Les lectures de cette date ne sont pas encore disponibles pour la {rite.label.toLowerCase()}.
        </p>
      )}
      {day?.note && <p className="mt-10 text-lg text-base-content/75">{day.note}</p>}
      {day?.projected && (
        <p className="mt-8 text-sm text-base-content/70">
          Lectures calculées d’après le cycle liturgique : l’AELF n’a pas encore publié cette date.
        </p>
      )}

      {masses.length > 1 ? (
        <div className="mt-10">
          <Choice label="Messes du jour" options={masses.map((m, idx) => m.name ?? `Messe ${idx + 1}`)} initial={initialMass}>
            {masses.map((m, idx) => (
              <MassReadings key={idx} mass={m} />
            ))}
          </Choice>
        </div>
      ) : (
        masses[0] && <MassReadings mass={masses[0]} />
      )}

      <footer className="mt-14 flex flex-col gap-4 border-t border-base-300 pt-6 text-sm leading-relaxed text-base-content/65">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base text-base-content/80">Une lecture qui ne correspond pas à ce jour, une erreur dans le texte ?</p>
          <ReportButton
            label="Signaler une erreur"
            className="btn btn-outline btn-primary h-11 min-h-11 rounded-full px-5"
            target={{
              ref: `lect:${rite.slug}:${iso}`,
              verse: null,
              wordIndex: null,
              endWordIndex: null,
              graphemeIndex: null,
              annotationId: null,
              scopeLabel: "lectures",
              categories: ["lecture", "traduction", "texte"],
            }}
          >
            Signaler une erreur
          </ReportButton>
        </div>
        <p>
          {[rite.note, day?.source && `Références des lectures : ${day.source}.`].filter(Boolean).join(" ")} Texte grec
          du corpus Anaginosko (SBLGNT pour le Nouveau Testament, Septante de Rahlfs), traduction française en regard.
        </p>
      </footer>
    </div>
  );
}
