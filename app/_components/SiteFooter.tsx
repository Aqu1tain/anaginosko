import Link from "next/link";

// Footer du site, rendu sur toutes les pages (dans le Shell) : liens de navigation
// et credits. Sert le maillage interne (indexation) au-dela de l'accueil.
export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-base-300 pt-8 pb-4 text-sm text-base-content/70">
      <nav aria-label="Liens du site" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
        <Link href="/nt" className="link-hover">Nouveau Testament</Link>
        <Link href="/lxx" className="link-hover">Septante</Link>
        <Link href="/alphabet" className="link-hover">Alphabet</Link>
        <Link href="/prononciation" className="link-hover">Prononciation</Link>
        <Link href="/concordance" className="link-hover">Concordance</Link>
        <a href="https://fr.tipeee.com/anaginosko" target="_blank" rel="noreferrer noopener" className="link-hover">
          Soutenir
        </a>
        <Link href="/mentions" className="link-hover">Mentions légales</Link>
        <Link href="/confidentialite" className="link-hover">Confidentialité</Link>
      </nav>
      <p className="mt-4 text-center text-xs">
        Sources et licences détaillées dans les mentions légales.
      </p>
    </footer>
  );
}
