import Link from "next/link";

export type Crumb = { label: string; href?: string; greek?: boolean };

// Fil d'Ariane (breadcrumb) : dernier élément = page courante (sans lien).
export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Fil d’Ariane" className="breadcrumbs max-w-full pt-4 pb-2 text-sm text-base-content/55">
      <ul>
        {items.map((it, i) => (
          <li key={i}>
            {it.href ? (
              <Link href={it.href} className={`link-hover${it.greek ? " font-greek" : ""}`}>
                {it.label}
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
