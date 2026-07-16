import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/auth";
import { listArticles, createArticle, type ArticleCategory, type ArticleSignature } from "@/lib/articles";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  return NextResponse.json({ articles: listArticles(auth) });
}

export async function POST(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const result = createArticle(auth, {
    title: body?.title,
    category: body?.category as ArticleCategory,
    signature: body?.signature as ArticleSignature | undefined,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ article: result.article }, { status: 201 });
}
