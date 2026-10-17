import Link from "next/link";

export type LegalSection = { id: string; title: string; body: React.ReactNode };

const DOCS = [
  { href: "/mentions", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/conditions", label: "Conditions" },
];

export const CONTACT = "contact@corentinrenard.com";

export function Mail() {
  return (
    <a className="link" href={`mailto:${CONTACT}`}>
      {CONTACT}
    </a>
  );
}

export function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className="link" href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export default function LegalDoc({
  path,
  title,
  updated,
  sections,
}: {
  path: string;
  title: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <div className="pt-6 pb-4 wide:grid wide:grid-cols-[11rem_minmax(0,1fr)_12rem] wide:gap-12">
      <nav aria-label="Informations légales">
        <ul className="flex gap-1 border-b border-base-300 wide:sticky wide:top-20 wide:flex-col wide:border-0">
          {DOCS.map((doc) => {
            const active = doc.href === path;
            return (
              <li key={doc.href}>
                <Link
                  href={doc.href}
                  aria-current={active ? "page" : undefined}
                  className={`block whitespace-nowrap border-b-2 px-2.5 py-2 text-sm wide:rounded-field wide:border-0 wide:px-3 wide:py-1.5 ${
                    active
                      ? "border-primary font-semibold text-base-content wide:bg-base-200"
                      : "border-transparent text-base-content/60 hover:text-base-content wide:hover:bg-base-200/60"
                  }`}
                >
                  {doc.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <article className="mt-6 max-w-[42rem] wide:mt-0">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-base-content/55">Mis à jour le {updated}</p>
        <div className="mt-8 space-y-10">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-20">
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <div className="mt-3 space-y-3 text-[0.95rem] leading-relaxed text-base-content/80 [&_strong]:font-semibold [&_strong]:text-base-content">
                {s.body}
              </div>
            </section>
          ))}
        </div>
      </article>

      <nav aria-label="Sur cette page" className="hidden wide:block">
        <div className="sticky top-20">
          <p className="text-xs font-semibold uppercase tracking-wider text-base-content/45">Sur cette page</p>
          <ul className="mt-3 space-y-2 border-l border-base-300 text-sm">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="-ml-px block border-l border-transparent pl-3 text-base-content/60 hover:border-base-content/40 hover:text-base-content">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </div>
  );
}
