import Link from "next/link";

export type Crumb = { label: string; href?: string; greek?: boolean; home?: boolean };

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 4l9 6.5" />
      <path d="M5 9.5V20h14V9.5" />
    </svg>
  );
}

// Fil d'Ariane (breadcrumb) : dernier élément = page courante (sans lien).
export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Fil d’Ariane" className="breadcrumbs max-w-full pt-4 pb-2 text-sm text-base-content/55">
      <ul>
        {items.map((it, i) => (
          <li key={i}>
            {it.href ? (
              <Link
                href={it.href}
                aria-label={it.home ? it.label : undefined}
                className={`link-hover${it.greek ? " font-greek" : ""}`}
              >
                {it.home ? <HomeIcon /> : it.label}
              </Link>
            ) : (
              <span
                aria-current="page"
                className={`font-medium text-base-content/90${it.greek ? " font-greek" : ""}`}
              >
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
