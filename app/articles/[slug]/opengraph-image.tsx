import sharp from "sharp";
import { getPublishedBySlug, readUpload } from "@/lib/articles";
import { publicAuthor } from "@/lib/profiles";
import { CATEGORY_LABEL } from "@/src/components/articles/labels";
import { articleCard } from "@/app/_og/cards";

export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";
export const alt = "Article · Anaginosko";
export const dynamic = "force-dynamic";

// La miniature de l'article est en WebP le plus souvent : convertie en JPEG,
// le format que lisent tous les aperçus de lien (WhatsApp compris).
const toJpeg = (buf: Buffer) => sharp(buf).resize(size.width, size.height, { fit: "cover" }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();

const reply = (buf: Buffer) => new Response(new Uint8Array(buf), { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=3600" } });

function coverOf(url: string | null): Buffer | null {
  const m = url?.match(/^\/articles\/uploads\/([a-z0-9-]+)\/([a-z0-9]+\.(?:png|jpe?g|webp))$/i);
  return m ? (readUpload(m[1], m[2])?.buf ?? null) : null;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = getPublishedBySlug(slug);
  const cover = a && coverOf(a.cover);
  if (cover) return reply(await toJpeg(cover));

  const card = await (a
    ? articleCard({ category: CATEGORY_LABEL[a.category] ?? "Article", title: a.title, excerpt: a.excerpt, author: publicAuthor(a.author.userId, a.author.name).name })
    : articleCard({ category: "Article", title: "Anaginosko", excerpt: "", author: null }));
  return reply(await toJpeg(Buffer.from(await card.arrayBuffer())));
}
