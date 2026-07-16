import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireEditor, states, checkOverride, saveOverride, revokeOverride, applyToReader, effectiveSources, materialize, type Source } from "@/lib/arbitration";

export const dynamic = "force-dynamic";

// Le lecteur LXX est pré-rendu statiquement (generateStaticParams) : réécrire
// fr.json ne suffit pas, il faut invalider la page pour qu'elle relise le fichier
// frais au prochain accès. C'est ce qui rendait les corrections de Biblion
// invisibles côté lecteur alors qu'elles étaient bien enregistrées.
// Rafraîchit le lecteur ; renvoie false si le fr.json servi n'a pas pu être réécrit
// (best-effort : l'arbitrage reste sauvegardé, servi au prochain déploiement).
function syncReader(book: string, ref: string): boolean {
  const ok = applyToReader(book, ref); // matérialise fr.json
  const ch = ref.split(":")[0];
  revalidatePath(`/lxx/${book}/${ch}`); // régénère la page du chapitre
  return ok;
}
const staleWarning = (ok: boolean) => (ok ? {} : { warning: "Enregistré. Le verset apparaîtra dans le lecteur au prochain déploiement." });

// Enregistre (ou révoque) une décision d'arbitrage. Intégrité sur CHAQUE écriture :
// existence des versets Giguet, ref grec valide (round-trip), zéro-perte (aucun
// verset Giguet consommé deux fois). Refus si violation : jamais d'état faux.
export async function POST(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const book = body?.book as string;
  const ref = body?.ref as string;
  if (!book || !ref) return NextResponse.json({ error: "book et ref requis." }, { status: 400 });

  const st = states()[book]?.[Number(ref.split(":")[0])];
  if (!st?.scaled) return NextResponse.json({ error: "Chapitre non scaled : verrouillé." }, { status: 403 });

  // Révocation : retour à l'auto (l'humain corrige l'humain).
  if (body.revoke) {
    revokeOverride(book, ref);
    const ok = syncReader(book, ref);
    const src = effectiveSources(book, ref);
    return NextResponse.json({ ok: true, revoked: true, preview: src ? materialize(book, src) : null, ...staleWarning(ok) });
  }

  // Sources : [ch, v] (verset entier) ou [ch, v, de, à] (extrait) - entiers only.
  const sources: Source[] = [];
  for (const s of (body.sources ?? []) as unknown[]) {
    if (!Array.isArray(s) || (s.length !== 2 && s.length !== 4) || s.some((n) => !Number.isInteger(Number(n))))
      return NextResponse.json({ ok: false, errors: [`Source invalide : ${JSON.stringify(s)}`] }, { status: 400 });
    sources.push(s.map(Number) as Source);
  }
  const maison = typeof body.maison === "string" ? body.maison.trim() : undefined;
  const check = checkOverride(book, ref, sources, maison);
  if (!check.ok) return NextResponse.json({ ok: false, errors: check.errors }, { status: 422 });
  saveOverride(book, ref, sources, auth.credit || "Βιβλίον", body.note, maison);
  const ok = syncReader(book, ref); // matérialise fr.json + régénère la page lecteur
  return NextResponse.json({ ok: true, preview: maison || (sources.length ? materialize(book, sources) : null), ...staleWarning(ok) });
}
