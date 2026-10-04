import Link from "next/link";

export default function LemmaNotFound({ href }: { href: string }) {
  return (
    <div className="py-20 text-center text-base-content/70">
      <p className="mt-2">Lemme introuvable.</p>
      <Link href={href} className="link link-primary mt-3 inline-block">
        Toute la concordance
      </Link>
    </div>
  );
}
