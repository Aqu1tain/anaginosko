import Link from "next/link";
import { loadBooksFs } from "../../lib/nt-server";
import { NT_GROUPS, bookById } from "../../src/data/nt";
import Breadcrumb from "../_components/Breadcrumb";

export const metadata = {
  title: "Nouveau Testament",
  description: "Les 27 livres du Nouveau Testament en grec koinè (SBLGNT), chapitre par chapitre.",
  alternates: { canonical: "/nt" },
};

export default async function NtTocPage() {
  const books = await loadBooksFs();
  return (
    <div className="pb-4">
      <Breadcrumb items={[{ label: "Accueil", href: "/", home: true }, { label: "Nouveau Testament" }]} />
      <h1 className="text-2xl font-bold">Nouveau Testament</h1>
      <p className="mt-1 mb-2 text-sm text-base-content/70">27 livres · texte grec SBLGNT</p>

      {NT_GROUPS.map((group) => (
        <section key={group.title} className="pt-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-base-content/55">
            {group.title}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {group.ids.map((id) => {
              const b = bookById(books, id);
              if (!b) return null;
              return (
                <Link
                  key={id}
                  href={`/nt/${id}`}
                  className="flex items-center justify-between gap-2 rounded-box border border-base-300 bg-base-100 px-3.5 py-2.5 transition-colors hover:border-primary/40"
                >
                  <span className="min-w-0 truncate font-medium">{b.name}</span>
                  <span className="badge badge-sm badge-ghost shrink-0">{b.chapters}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
