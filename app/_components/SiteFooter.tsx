import Link from "next/link";

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: "Lire",
    links: [
      ["Nouveau Testament", "/nt"],
      ["Septante", "/lxx"],
      ["Lectures du jour", "/lectures"],
    ],
  },
  {
    title: "Étudier",
    links: [
      ["Apprendre le grec", "/apprendre"],
      ["Concordance", "/concordance"],
      ["Alphabet", "/alphabet"],
      ["Prononciation", "/prononciation"],
    ],
  },
  {
    title: "Projet",
    links: [
      ["Articles", "/articles"],
      ["À propos", "/a-propos"],
      ["Contributeurs", "/contributeurs"],
    ],
  },
];

const LEGAL: [string, string][] = [
  ["Mentions légales", "/mentions"],
  ["Confidentialité", "/confidentialite"],
  ["Conditions", "/conditions"],
];

export default function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-base-300 pt-12 pb-6 text-sm">
      <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-16">
        <div>
          <Link href="/" className="text-lg font-bold tracking-tight font-[family-name:var(--font-syne)]">
            Anaginosko
          </Link>
          <p className="mt-1 text-base-content/70">La Bible en grec, mot à mot.</p>
          <a
            href="https://fr.tipeee.com/anaginosko"
            target="_blank"
            rel="noreferrer noopener"
            className="btn btn-outline btn-sm mt-4"
          >
            Soutenir
          </a>
        </div>
        <nav aria-label="Plan du site" className="grid grid-cols-2 gap-x-12 gap-y-6 sm:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-base-content/50">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-base-content/70 hover:text-base-content">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-base-content/50">
        <span>© 2026 Anaginosko</span>
        <nav aria-label="Informations légales" className="flex flex-wrap gap-x-5 gap-y-2">
          {LEGAL.map(([label, href]) => (
            <Link key={href} href={href} className="hover:text-base-content">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
