import type { Route } from "../hooks/useHashRoute";

function Item({
  href,
  active,
  label,
  children,
}: {
  href: string;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.7rem] font-medium transition-colors ${
        active ? "text-primary" : "text-base-content/55 hover:text-base-content"
      }`}
    >
      {children}
      <span>{label}</span>
    </a>
  );
}

export default function TabBar({ route }: { route: Route }) {
  const reading = route.name === "library" || route.name === "text";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-base-300 bg-base-100/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-2xl">
        <Item href="#/" active={reading} label="Lire">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 5.5A1.5 1.5 0 015.5 4H11v15H5.5A1.5 1.5 0 014 17.5v-12zM20 5.5A1.5 1.5 0 0018.5 4H13v15h5.5a1.5 1.5 0 001.5-1.5v-12z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </Item>
        <Item href="#/alphabet" active={route.name === "alphabet"} label="Alphabet">
          <span className="font-greek text-[1.15rem] leading-none">Αα</span>
        </Item>
        <Item href="#/concordance" active={route.name === "concordance"} label="Concordance">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </Item>
      </div>
    </nav>
  );
}
