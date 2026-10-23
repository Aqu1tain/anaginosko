import type { Metadata } from "next";
import Link from "next/link";
import BreadcrumbJsonLd from "@/app/_components/BreadcrumbJsonLd";
import JsonLd from "@/app/_components/JsonLd";
import Avatar from "@/src/components/profile/Avatar";
import { SITE, SITE_PITCH, pageMetadata } from "@/lib/seo";
import { fr, loadSiteFacts } from "@/lib/siteFacts";
import { listTeam } from "@/lib/team";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "À propos : une Bible grecque d’étude, gratuite",
  description: `${SITE_PITCH} Sources, méthode, public visé et manière de citer le site.`,
  path: "/a-propos",
});

const FEATURES = [
  {
    title: "Lire",
    href: "/nt",
    body: "Chaque chapitre en grec avec la traduction en regard. Un mot touché donne son lemme, son analyse, sa prononciation et la notice du Bailly.",
  },
  {
    title: "Étudier un mot",
    href: "/concordance",
    body: "Toutes les occurrences d’un lemme, sa répartition par livre et son usage dans l’autre Testament.",
  },
  {
    title: "Suivre la liturgie",
    href: "/lectures",
    body: "Les lectures du jour en grec pour la forme ordinaire, la forme extraordinaire et le rite byzantin.",
  },
  {
    title: "Apprendre",
    href: "/apprendre",
    body: "Un cours de grec biblique avec exercices, l’alphabet et la prononciation.",
  },
];

const SOURCES = [
  ["Nouveau Testament", "SBLGNT, éd. Michael W. Holmes"],
  ["Morphologie du NT", "MorphGNT, SBLGNT Edition 6.12, éd. James K. Tauber"],
  ["Septante", "Rahlfs 1935, via LXX-Rahlfs-1935 (Eliran Wong)"],
  ["Dictionnaire", "Bailly 2020 Hugo Chávez (Gérard Gréco et al.)"],
  ["Traduction du NT", "Sainte Bible néo-Crampon Libre (Fraternité de Tibériade, 2022)"],
  ["Traduction de la Septante", "Pierre Giguet (1872), transcription Wikisource"],
  ["Lectionnaires", "AELF, Divinum Officium, Missale Meum, orthocal (références seules)"],
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-12 grid gap-4 wide:grid-cols-[13rem_minmax(0,1fr)] wide:gap-12">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="min-w-0 text-[0.95rem] leading-relaxed">{children}</div>
    </section>
  );
}

export default async function AboutPage() {
  const f = await loadSiteFacts();
  const team = listTeam();
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
  const facts = [
    { value: fr(f.nt.words), label: "mots du Nouveau Testament", detail: `${f.nt.books} livres, ${fr(f.nt.chapters)} chapitres` },
    { value: fr(f.lxx.words), label: "mots de la Septante", detail: `${f.lxx.books} livres, ${fr(f.lxx.chapters)} chapitres` },
    { value: fr(f.lemmas), label: "lemmes", detail: `${fr(f.nt.lemmas)} NT, ${fr(f.lxx.lemmas)} Septante` },
    { value: fr(f.baillyNotices), label: "notices du Bailly", detail: "depuis chaque mot" },
  ];

  return (
    <div className="pb-12 pt-6">
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

      <header>
        <h1 className="text-3xl font-bold tracking-tight">À propos</h1>
        <p className="mt-4 max-w-[42rem] text-lg leading-relaxed text-base-content/70">
          Anaginosko (<span className="font-greek">ἀναγινώσκω</span>, « lire, reconnaître ») est une Bible grecque
          d’étude, gratuite et sans publicité : le Nouveau Testament et la Septante dans le texte, chaque mot analysé, la
          traduction française en regard.
        </p>
        <ul className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 wide:grid-cols-4">
          {facts.map((x) => (
            <li key={x.label}>
              <p className="text-3xl font-bold tracking-tight tabular-nums">{x.value}</p>
              <p className="mt-1 text-sm font-medium">{x.label}</p>
              <p className="text-xs text-base-content/50">{x.detail}</p>
            </li>
          ))}
        </ul>
      </header>

      <Section id="usage" title="Ce qu’on y fait">
        <ul className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {FEATURES.map((x) => (
            <li key={x.href}>
              <Link href={x.href} className="font-semibold text-base-content hover:text-primary">
                {x.title} →
              </Link>
              <p className="mt-1">{x.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="public" title="Pour qui">
        <p className="max-w-[42rem]">
          Étudiants en théologie et en lettres classiques, séminaristes, prêtres et pasteurs qui préparent une homélie,
          hellénistes, chercheurs, et quiconque veut lire la Bible dans sa langue, de l’alphabet jusqu’au travail sur un
          mot.
        </p>
      </Section>

      <Section id="sources" title="Sources">
        <dl className="divide-y divide-base-300">
          {SOURCES.map(([what, source]) => (
            <div key={what} className="grid gap-1 py-2.5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4">
              <dt className="text-sm font-semibold text-base-content">{what}</dt>
              <dd className="text-sm">{source}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm">
          Licences et droits : <Link href="/mentions#sources" className="link">mentions légales</Link>.
        </p>
      </Section>

      <Section id="methode" title="Méthode">
        <div className="max-w-[42rem] space-y-3">
          <p>
            Une définition n’est affichée que si la vedette du Bailly correspond au lemme, ou à sa forme active pour un
            verbe moyen, ce qui est alors indiqué.
          </p>
          <p>
            Les versets retraduits par l’équipe sont signés dans le lecteur. Chaque verset a un bouton pour signaler une
            erreur ; les corrections sont publiées en continu.
          </p>
        </div>
      </Section>

      <Section id="citer" title="Citer">
        <p>Indiquez la page et la date de consultation :</p>
        <p className="mt-3 rounded-box bg-base-200 px-4 py-3 text-sm">
          Anaginosko, Jean 1, {SITE}/nt/jn/1, consulté le {today}.
        </p>
        <p className="mt-3">Citez aussi les éditions sources.</p>
      </Section>

      <Section id="donnees" title="Données et IA">
        <p className="max-w-[42rem]">
          Résumé pour les assistants : <a href="/llms.txt" className="link">llms.txt</a>. Chaque chapitre et chaque fiche
          de lemme existe en Markdown (<a href="/nt/jn/1.md" className="link">/nt/jn/1.md</a>), et chaque chapitre en
          JSON mot à mot (<a href="/nt/jn/1.json" className="link">/nt/jn/1.json</a>). Merci de renvoyer vers la page
          d’origine.
        </p>
      </Section>

      <Section id="equipe" title="Équipe">
        <p className="max-w-[42rem]">
          Projet indépendant, conçu et développé par Corentin Renard. Les traductions Anaginosko sont signées Corentin
          Renard et Biblion.
        </p>
        {team.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-3">
            {team.map((m) => (
              <li key={m.userId}>
                <Link
                  href={`/contributeurs/${m.slug}`}
                  className="flex items-center gap-3 rounded-box border border-base-300 py-2 pr-4 pl-2 transition-colors hover:border-primary/40"
                >
                  <Avatar name={m.displayName} photo={m.photo} size={36} />
                  <span className="font-medium text-base-content">{m.displayName}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a href="https://fr.tipeee.com/anaginosko" target="_blank" rel="noreferrer noopener" className="btn btn-primary btn-sm">
            Soutenir sur Tipeee
          </a>
          <span className="text-sm text-base-content/50">Le site vit des dons.</span>
        </div>
      </Section>
    </div>
  );
}
