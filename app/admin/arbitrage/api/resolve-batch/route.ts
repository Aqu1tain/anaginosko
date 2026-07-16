import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireEditor, states, checkBatch, saveOverride, revokeOverride, applyToReader, type Source } from "@/lib/arbitration";

export const dynamic = "force-dynamic";

// Enregistrement PAR LOT : un réalignement de chapitre change plusieurs versets d'un
// coup (glisser la colonne française décale toute la suite). On valide TOUT d'abord
// (intégrité sur chaque changement), puis on écrit tout : ou l'ensemble passe, ou rien.
// Chaque changement : { ref, sources } (lien), { ref, maison } (traduction maison),
// ou { ref, revoke } (retour auto).
type Change = { ref: string; sources?: unknown[]; maison?: string; revoke?: boolean };

export async function POST(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const book = body?.book as string;
  const changes = (body?.changes ?? []) as Change[];
  if (!book || !Array.isArray(changes) || !changes.length) return NextResponse.json({ error: "book et changes requis." }, { status: 400 });

  // Tous les versets doivent être dans des chapitres scaled.
  const parsed: { ref: string; sources: Source[]; maison?: string; revoke?: boolean }[] = [];
  for (const c of changes) {
    if (!c.ref || !/^\d+:\d+$/.test(c.ref)) return NextResponse.json({ ok: false, errors: [`Ref invalide : ${c.ref}`] }, { status: 400 });
    const st = states()[book]?.[Number(c.ref.split(":")[0])];
    if (!st?.scaled) return NextResponse.json({ ok: false, errors: [`Chapitre non scaled : ${c.ref}`] }, { status: 403 });
    if (c.revoke) { parsed.push({ ref: c.ref, sources: [], revoke: true }); continue; }
    const maison = typeof c.maison === "string" ? c.maison.trim() : undefined;
    const sources: Source[] = [];
    for (const s of c.sources ?? []) {
      if (!Array.isArray(s) || (s.length !== 2 && s.length !== 4) || s.some((n) => !Number.isInteger(Number(n))))
        return NextResponse.json({ ok: false, errors: [`Source invalide : ${JSON.stringify(s)}`] }, { status: 400 });
      sources.push(s.map(Number) as Source);
    }
    parsed.push({ ref: c.ref, sources, maison });
  }

  // 1) Valider TOUT (intégrité, zéro-perte à l'échelle du lot) avant d'écrire. Un
  //    décalage de chapitre est une permutation cohérente : le zéro-perte se juge sur
  //    l'état APRÈS application du lot, pas verset par verset contre l'état courant.
  const failures = checkBatch(book, parsed);
  if (failures.length) return NextResponse.json({ ok: false, errors: failures.map((f) => `${f.ref} : ${f.errors.join(" ; ")}`) }, { status: 422 });

  // 2) Écrire tout, puis matérialiser + revalider chaque chapitre touché une fois.
  for (const p of parsed) {
    if (p.revoke) revokeOverride(book, p.ref);
    else saveOverride(book, p.ref, p.sources, auth.credit || "Βιβλίον", body.note, p.maison);
  }
  const chapters = new Set<string>();
  let refreshed = 0;
  for (const p of parsed) { if (applyToReader(book, p.ref)) refreshed++; chapters.add(p.ref.split(":")[0]); }
  for (const ch of chapters) revalidatePath(`/lxx/${book}/${ch}`);
  // L'arbitrage est sauvegardé (durable). Si le lecteur n'a pas pu être rafraîchi en
  // direct (fr.json non inscriptible par le service), on le signale sans échouer :
  // le prochain déploiement le sert.
  const stale = parsed.length - refreshed;
  return NextResponse.json({ ok: true, applied: parsed.length, ...(stale ? { warning: `Enregistré. ${stale} verset(s) apparaîtront dans le lecteur au prochain déploiement.` } : {}) });
}
