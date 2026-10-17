import type { Metadata } from "next";
import Link from "next/link";
import { listTeam } from "@/lib/team";
import { pageMetadata } from "@/lib/seo";
import Avatar from "@/src/components/profile/Avatar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Équipe",
  description: "Les personnes qui écrivent, traduisent et relisent Anaginosko.",
  path: "/contributeurs",
});

export default function TeamPage() {
  const members = listTeam();
  return (
    <div className="pt-6 pb-4">
      <h1 className="text-3xl font-bold tracking-tight">Équipe</h1>
      {members.length === 0 && <p className="mt-6 text-base-content/60">Aucun profil public.</p>}
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 wide:grid-cols-3">
        {members.map((m) => (
          <li key={m.userId}>
            <Link
              href={`/contributeurs/${m.slug}`}
              className="flex h-full gap-4 rounded-box border border-base-300 p-5 transition-colors hover:bg-base-200/50"
            >
              <Avatar name={m.displayName} photo={m.photo} size={56} />
              <div className="min-w-0">
                <p className="font-semibold">{m.displayName}</p>
                {m.articles > 0 && (
                  <p className="text-sm text-base-content/55">
                    {m.articles} article{m.articles > 1 ? "s" : ""}
                  </p>
                )}
                {m.bio && <p className="mt-2 line-clamp-3 text-sm text-base-content/75">{m.bio}</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
