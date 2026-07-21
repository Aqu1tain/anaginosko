import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { getBookIntro, saveBookIntro } from "@/lib/bookIntros";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ corpus: string; book: string }> };

const deny = (auth: { id?: number }) => (auth.id != null ? 403 : 401);

export async function GET(req: Request, { params }: Ctx) {
  const auth = await requirePermission(req.headers.get("authorization"), "review");
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux éditeurs." }, { status: deny(auth) });
  const { corpus, book } = await params;
  return NextResponse.json({ intro: getBookIntro(corpus, book) });
}

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await requirePermission(req.headers.get("authorization"), "review");
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux éditeurs." }, { status: deny(auth) });
  const { corpus, book } = await params;
  const body = await req.json().catch(() => null);
  const result = saveBookIntro(corpus, book, body ?? {}, auth);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  // Page de livre SSG : régénérer pour refléter l'intro (édition, publication, dépublication).
  revalidatePath(`/${corpus}/${book}`);
  return NextResponse.json({ intro: result.intro });
}
