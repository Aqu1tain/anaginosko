import type { Route } from "../hooks/useHashRoute";

const ICONS = {
  read: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5.5A1.5 1.5 0 015.5 4H11v15H5.5A1.5 1.5 0 014 17.5v-12zM20 5.5A1.5 1.5 0 0018.5 4H13v15h5.5a1.5 1.5 0 001.5-1.5v-12z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
  alphabet: <span className="font-greek text-[1.15rem] leading-none">Αα</span>,
  concordance: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
};

type Tab = { href: string; label: string; icon: React.ReactNode; active: boolean };

export default function TabBar({ route }: { route: Route }) {
  const reading = route.name === "library" || route.name === "text";
  const tabs: Tab[] = [
    { href: "#/", label: "Lire", icon: ICONS.read, active: reading },
    { href: "#/alphabet", label: "Alphabet", icon: ICONS.alphabet, active: route.name === "alphabet" },
    { href: "#/concordance", label: "Concordance", icon: ICONS.concordance, active: route.name === "concordance" },
  ];

  return (
    <>
      {/* Mobile / tablette : barre fixée en bas. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-base-300 bg-base-100/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md wide:hidden">
        <div className="mx-auto flex w-full max-w-2xl">
          {tabs.map((t) => (
            <a
              key={t.href}
              href={t.href}
              aria-current={t.active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.7rem] font-medium transition-colors ${
                t.active ? "text-primary" : "text-base-content/65 hover:text-base-content"
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </a>
          ))}
        </div>
      </nav>

      {/* Desktop large : rail vertical flottant à gauche. Le fond actif n'entoure
          que l'icône (pastille carrée), le libellé reste en texte simple. */}
      <nav className="fixed top-1/2 left-4 z-40 hidden -translate-y-1/2 flex-col gap-2 wide:flex">
        {tabs.map((t) => (
          <a
            key={t.href}
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className={`group flex flex-col items-center gap-1 text-[0.7rem] font-medium transition-colors ${
              t.active ? "text-primary" : "text-base-content/65 hover:text-base-content"
            }`}
          >
            <span
              className={`grid h-11 w-11 place-items-center rounded-2xl transition-colors ${
                t.active ? "bg-primary/12 text-primary" : "group-hover:bg-base-200"
              }`}
            >
              {t.icon}
            </span>
            <span>{t.label}</span>
          </a>
        ))}
      </nav>
    </>
  );
}
