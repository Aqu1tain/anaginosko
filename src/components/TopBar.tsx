import type { Route } from "../hooks/useHashRoute";
import type { Text } from "../data/texts";

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={dark ? "Passer en clair" : "Passer en sombre"}
      className="btn btn-ghost btn-circle"
    >
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20 14.5A8 8 0 019.5 4a7 7 0 1010.5 10.5z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )}
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
        : route.name === "text"
          ? (text?.reference ?? "Texte")
          : null;

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
              <a href="#/" aria-label="Retour" className="btn btn-ghost btn-circle">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              {title && <span className="truncate text-base font-semibold">{title}</span>}
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isLibrary && (
            <>
              <a href="#/alphabet" className="btn btn-ghost btn-sm">
                Alphabet
              </a>
              <a href="#/concordance" className="btn btn-ghost btn-sm">
                Concordance
              </a>
            </>
          )}
          <ThemeToggle dark={dark} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  );
}
