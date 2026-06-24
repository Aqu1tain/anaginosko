import type { Route } from "../hooks/useHashRoute";
import type { Text } from "../data/texts";
import { BOOK_NAMES } from "../data/nt";

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={dark ? "Passer en clair" : "Passer en sombre"}
      aria-pressed={dark}
      className="btn btn-ghost btn-circle"
    >
      <svg
        className={`theme-icon ${dark ? "is-dark" : ""}`}
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <mask id="theme-moon-mask">
          <rect x="0" y="0" width="24" height="24" fill="white" />
          {/* Ce disque glisse devant le soleil pour creuser le croissant. */}
          <circle className="theme-cutout" cx="24" cy="3" r="6" fill="black" />
        </mask>
        {/* Corps : soleil (plein) qui se réduit en lune (croissant via le masque). */}
        <circle
          className="theme-core"
          cx="12"
          cy="12"
          r="5"
          fill="currentColor"
          mask="url(#theme-moon-mask)"
        />
        {/* Rayons : présents le jour, rétractés la nuit. */}
        <g className="theme-rays" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <line x1="12" y1="1.5" x2="12" y2="3.8" />
          <line x1="12" y1="20.2" x2="12" y2="22.5" />
          <line x1="1.5" y1="12" x2="3.8" y2="12" />
          <line x1="20.2" y1="12" x2="22.5" y2="12" />
          <line x1="4.4" y1="4.4" x2="6" y2="6" />
          <line x1="18" y1="18" x2="19.6" y2="19.6" />
          <line x1="19.6" y1="4.4" x2="18" y2="6" />
          <line x1="6" y1="18" x2="4.4" y2="19.6" />
        </g>
      </svg>
    </button>
  );
}

export default function TopBar({
  route,
  text,
  dark,
  onToggleTheme,
}: {
  route: Route;
  text: Text | undefined;
  dark: boolean;
  onToggleTheme: () => void;
}) {
  const isLibrary = route.name === "library";
  const title =
    route.name === "alphabet"
      ? "L’alphabet"
      : route.name === "concordance"
        ? "Concordance"
        : route.name === "mentions"
          ? "Mentions légales"
          : route.name === "ntToc"
            ? "Nouveau Testament"
            : route.name === "ntBook"
              ? (BOOK_NAMES[route.book] ?? "Livre")
              : route.name === "ntChapter"
                ? `${BOOK_NAMES[route.book] ?? ""} ${route.chapter}`.trim()
                : route.name === "text"
                  ? (text?.reference ?? "Texte")
                  : route.name === "login"
                    ? "Connexion"
                    : route.name === "admin"
                      ? "Tableau de bord"
                      : null;

  const backHref =
    route.name === "ntBook"
      ? "#/nt"
      : route.name === "ntChapter"
        ? `#/nt/${route.book}`
        : "#/";

  return (
    <header className="sticky top-0 z-30 border-b border-base-300 bg-base-100/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="navbar mx-auto min-h-14 w-full max-w-2xl gap-1 px-2">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {isLibrary ? (
            <a href="#/" className="btn btn-ghost px-2 text-lg font-bold tracking-tight">
              Anaginosko
            </a>
          ) : (
            <>
              <a href={backHref} aria-label="Retour" className="btn btn-ghost btn-circle">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              {title && <span className="truncate text-base font-semibold">{title}</span>}
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <a href="#/login" aria-label="Espace contributeurs" className="btn btn-ghost btn-circle btn-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M12 13.5c-4 0-7.2 2.4-7.5 5.6A1 1 0 005.5 20.5h13a1 1 0 001-1.4c-.3-3.2-3.5-5.6-7.5-5.6z" />
            </svg>
          </a>
          <ThemeToggle dark={dark} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  );
}
