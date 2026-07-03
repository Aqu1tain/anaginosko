import type { Metadata } from "next";
import Link from "next/link";
import { letters, diphthongs } from "@/src/data/alphabet";
import Breadcrumb from "@/app/_components/Breadcrumb";

export const metadata: Metadata = {
  title: "Prononciation du grec biblique : érasmienne ou restituée ?",
  description:
    "Comment prononcer le grec de la Bible ? Les deux systèmes expliqués : la prononciation érasmienne de l’enseignement classique et la prononciation restituée du Ier siècle, avec tableau comparatif lettre par lettre et diphtongues.",
  alternates: { canonical: "/prononciation" },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    siteName: "Anaginosko",
    title: "Prononciation du grec biblique : érasmienne ou restituée ?",
  },
};

// Page explicative indexable : le contenu érasmien / restituée vivait uniquement
// dans les fiches interactives (invisibles des moteurs). Ici, la synthèse en
// prose + tableaux, générée depuis la même source de données que l'application.
export default function PrononciationPage() {
  const differing = letters.filter((l) => l.erasmien !== l.restituee);

  return (
    <article className="mx-auto max-w-2xl pb-10">
      <Breadcrumb items={[{ label: "Accueil", href: "/", home: true }, { label: "Prononciation" }]} />
      <h1 className="text-2xl font-bold">Prononciation du grec biblique : érasmienne ou restituée ?</h1>

      <div className="mt-3 space-y-3 text-[0.95rem] leading-relaxed text-base-content/85">
        <p>
          Comment prononçait-on le grec du Nouveau Testament et de la Septante ? Deux
          systèmes coexistent aujourd’hui dans l’étude du grec biblique, et Anaginosko
          affiche les deux, mot par mot et lettre par lettre.
        </p>
        <h2 className="pt-2 text-lg font-bold text-base-content">La prononciation érasmienne</h2>
        <p>
          Héritée d’Érasme de Rotterdam (<em>De recta latini graecique sermonis
          pronuntiatione</em>, 1528), c’est la convention de l’enseignement classique :
          chaque lettre reçoit un son stable et distinct, ce qui rend l’orthographe
          transparente. Êta se lit « ê », thêta « t », les diphtongues se prononcent
          comme elles s’écrivent (αι « aï », οι « oï »). C’est la prononciation des
          cours de grec ancien, pratique pour apprendre à lire et mémoriser
          l’orthographe.
        </p>
        <h2 className="pt-2 text-lg font-bold text-base-content">La prononciation restituée</h2>
        <p>
          Reconstituée par la philologie à partir des inscriptions, des papyrus et des
          fautes d’orthographe des copistes, elle approche la koinè telle qu’on la
          parlait au Ier siècle, celle qu’entendaient les apôtres. Le bêta glisse vers
          « v », êta se ferme vers « i », thêta devient aspiré, et plusieurs diphtongues
          se réduisent à une voyelle simple (ει se lit « i », αι se lit « é »). C’est la
          prononciation la plus proche de la langue vivante du Nouveau Testament.
        </p>
        <h2 className="pt-2 text-lg font-bold text-base-content">Laquelle choisir ?</h2>
        <p>
          Les deux se défendent : l’érasmienne pour étudier et épeler, la restituée pour
          entendre le texte comme ses premiers auditeurs. Sur Anaginosko, chaque lettre
          et chaque mot donnent les deux prononciations ; le réglage « Affichage » du
          lecteur permet d’afficher l’une ou l’autre sous le texte grec.
        </p>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-bold">Les lettres qui changent</h2>
        <p className="mt-1 text-sm text-base-content/70">
          Les {differing.length} lettres dont la valeur diffère entre les deux systèmes.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Lettre</th>
                <th>Nom</th>
                <th>Érasmienne</th>
                <th>Restituée</th>
              </tr>
            </thead>
            <tbody>
              {differing.map((l) => (
                <tr key={l.name}>
                  <td className="font-greek text-lg">{l.upper} {l.lower}{l.final ? ` ${l.final}` : ""}</td>
                  <td>{l.name}</td>
                  <td>{l.erasmien}</td>
                  <td>{l.restituee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">Les diphtongues</h2>
        <p className="mt-1 text-sm text-base-content/70">
          C’est là que les deux systèmes s’écartent le plus.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Diphtongue</th>
                <th>Érasmienne</th>
                <th>Restituée</th>
              </tr>
            </thead>
            <tbody>
              {diphthongs.map((d) => (
                <tr key={d.greek}>
                  <td className="font-greek text-lg">{d.greek}</td>
                  <td>{d.erasmien}</td>
                  <td>{d.restituee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">Pour aller plus loin</h2>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-base-content/85">
          L’<Link href="/alphabet" className="link link-primary">alphabet grec complet</Link>{" "}
          détaille chaque lettre avec ses deux prononciations, les esprits et les
          accents. Et le meilleur exercice reste la lecture elle-même :{" "}
          <Link href="/nt/jn/1" className="link link-primary">ouvrez l’évangile selon Jean</Link>{" "}
          et touchez n’importe quelle lettre pour entendre ses deux prononciations.
        </p>
      </section>
    </article>
  );
}
