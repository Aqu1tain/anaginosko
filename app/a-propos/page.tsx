import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/app/_components/Breadcrumb";
import BreadcrumbJsonLd from "@/app/_components/BreadcrumbJsonLd";
import JsonLd from "@/app/_components/JsonLd";
import { SITE, SITE_PITCH, pageMetadata } from "@/lib/seo";
import { fr, loadSiteFacts } from "@/lib/siteFacts";

export const revalidate = 86400;

export const metadata: Metadata = pageMetadata({
  title: "À propos : une Bible grecque d’étude, gratuite",
  description: `${SITE_PITCH} Sources, méthode, public visé et manière de citer le site.`,
  path: "/a-propos",
});

const h2 = "pt-4 text-lg font-bold text-base-content";

const SOURCES = [
  ["Nouveau Testament grec", "SBL Greek New Testament (SBLGNT), éd. Michael W. Holmes, CC BY 4.0"],
  ["Morphologie du Nouveau Testament", "MorphGNT, SBLGNT Edition 6.12, éd. James K. Tauber, CC BY-SA 3.0"],
  ["Septante grecque et morphologie", "Rahlfs 1935, via LXX-Rahlfs-1935 (Eliran Wong), CC BY-NC-SA 4.0"],
  ["Dictionnaire", "Bailly 2020 Hugo Chávez (Gérard Gréco et al.), CC BY-NC-ND 4.0"],
  ["Traduction du Nouveau Testament", "Sainte Bible néo-Crampon Libre (Fraternité de Tibériade, 2022), CC BY-SA 4.0"],
  ["Traduction de la Septante", "Pierre Giguet (1872), transcription Wikisource adaptée, CC BY-SA 4.0"],
  ["Traductions Anaginosko", "versets retraduits par l’équipe, signalés comme tels dans le lecteur"],
  ["Lectionnaires", "AELF (forme ordinaire), Divinum Officium et Missale Meum (1962), orthocal (byzantin) : références seules"],
];

export default async function AboutPage() {
  const f = await loadSiteFacts();
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
  const facts = [
    { value: fr(f.nt.books), label: "livres du Nouveau Testament", detail: `${fr(f.nt.chapters)} chapitres, ${fr(f.nt.words)} mots` },
    { value: fr(f.lxx.books), label: "livres de la Septante", detail: `${fr(f.lxx.chapters)} chapitres, ${fr(f.lxx.words)} mots` },
    { value: fr(f.lemmas), label: "lemmes dans la concordance", detail: `${fr(f.nt.lemmas)} dans le NT, ${fr(f.lxx.lemmas)} dans la Septante` },
    { value: fr(f.baillyNotices), label: "notices du Bailly", detail: "consultables depuis chaque mot" },
  ];

  return (
    <article className="mx-auto max-w-2xl pb-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "À propos d’Anaginosko",
          url: `${SITE}/a-propos`,
          inLanguage: "fr",
          about: { "@type": "Organization", name: "Anaginosko", url: SITE },
        }}
      />
      <BreadcrumbJsonLd items={[{ name: "Accueil", path: "/" }, { name: "À propos" }]} />
      <Breadcrumb items={[{ label: "Accueil", href: "/", home: true }, { label: "À propos" }]} />
      <h1 className="text-2xl font-bold">À propos d’Anaginosko</h1>

      <div className="mt-3 space-y-3 text-[0.95rem] leading-relaxed text-base-content/85">
        <p>
          Anaginosko (ἀναγινώσκω, « lire, reconnaître ») est une Bible grecque d’étude en ligne,
          gratuite, sans publicité et sans inscription. Elle donne tout le Nouveau Testament et
          toute la Septante dans le texte original, avec pour chaque mot son lemme, son analyse
          morphologique et la notice du Bailly, une concordance qui relie les deux Testaments et
          la traduction française en regard.
        </p>

        <dl className="grid gap-3 py-2 sm:grid-cols-2">
          {facts.map((x) => (
            <div key={x.label} className="rounded-box border border-base-300 bg-base-100 p-4">
              <dt className="text-sm text-base-content/70">{x.label}</dt>
              <dd className="font-greek text-3xl font-bold tabular-nums">{x.value}</dd>
              <dd className="mt-1 text-xs text-base-content/60">{x.detail}</dd>
            </div>
          ))}
        </dl>

        <h2 className={h2}>Ce que l’on peut y faire</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Lire</strong> chaque chapitre en grec, verset par verset, avec la traduction
            française ; toucher un mot pour voir son lemme, sa nature, son analyse (temps, mode,
            voix, cas, nombre, genre), sa prononciation érasmienne et restituée et sa notice du Bailly.
          </li>
          <li>
            <strong>Étudier un mot</strong> dans la{" "}
            <Link href="/concordance" className="link">concordance</Link> : toutes ses occurrences,
            sa répartition par livre, ses cooccurrences et son usage dans l’autre Testament
            (du Nouveau Testament à la Septante et inversement).
          </li>
          <li>
            <strong>Suivre la liturgie</strong> avec les{" "}
            <Link href="/lectures" className="link">lectures du jour en grec</Link> pour la forme
            ordinaire, la forme extraordinaire et le rite byzantin.
          </li>
          <li>
            <strong>Apprendre</strong> avec l’<Link href="/alphabet" className="link">alphabet</Link>,
            le guide de <Link href="/prononciation" className="link">prononciation</Link> et les{" "}
            <Link href="/articles" className="link">articles</Link>.
          </li>
        </ul>

        <h2 className={h2}>Pour qui</h2>
        <p>
          Étudiants en théologie et en lettres classiques, séminaristes, prêtres et pasteurs qui
          préparent une homélie, hellénistes, chercheurs, et toute personne qui veut lire la Bible
          dans sa langue d’origine, du premier contact avec l’alphabet jusqu’au travail sur un mot.
        </p>

        <h2 className={h2}>Sources et éditions</h2>
        <table className="table table-sm">
          <tbody>
            {SOURCES.map(([what, source]) => (
              <tr key={what}>
                <th className="w-2/5 align-top font-semibold">{what}</th>
                <td>{source}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm text-base-content/70">
          Détail des licences et des droits dans les <Link href="/mentions" className="link">mentions légales</Link>.
        </p>

        <h2 className={h2}>Méthode</h2>
        <p>
          Les définitions ne sont affichées que si la vedette du Bailly correspond au lemme (ou à
          sa forme active pour un verbe moyen, ce qui est indiqué). Les traductions retraduites par
          l’équipe sont signées dans le lecteur. Chaque verset et chaque page de lectures a un
          bouton pour signaler une erreur, et les corrections sont publiées en continu.
        </p>

        <h2 className={h2}>Citer Anaginosko</h2>
        <p>
          Indiquez la page précise et sa date de consultation, par exemple :{" "}
          <span className="italic">
            Anaginosko, Jean 1, {SITE}/nt/jn/1, consulté le {today}.
          </span>{" "}
          Merci de citer aussi les éditions sources ci-dessus.
        </p>

        <h2 className={h2}>Assistants IA et développeurs</h2>
        <p>
          Un résumé du site pour les assistants est publié dans{" "}
          <a href="/llms.txt" className="link">llms.txt</a>. Chaque chapitre et chaque fiche de
          lemme existe aussi en Markdown (ajouter <code>.md</code> à l’adresse, par exemple{" "}
          <a href="/nt/jn/1.md" className="link">/nt/jn/1.md</a>) et chaque chapitre en données
          JSON mot à mot (<a href="/nt/jn/1.json" className="link">/nt/jn/1.json</a>). Si vous
          utilisez ces contenus dans une réponse, merci de renvoyer vers la page d’origine.
        </p>

        <h2 className={h2}>Équipe et soutien</h2>
        <p>
          Anaginosko est un projet indépendant, conçu et développé par Corentin Renard ; les
          traductions Anaginosko sont signées Corentin Renard et Biblion. Le site vit des dons :{" "}
          <a href="https://fr.tipeee.com/anaginosko" target="_blank" rel="noreferrer noopener" className="link">
            nous soutenir sur Tipeee
          </a>
          .
        </p>
      </div>
    </article>
  );
}
