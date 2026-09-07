import { readUpload } from "@/lib/articles";

export const dynamic = "force-dynamic";

// Sert les images d'articles depuis ARTICLES_DIR (hors bundle). Public : les <img>
// ne portent pas de jeton ; l'URL est en hash non devinable, même posture que les
// JSON de corpus servis par nginx.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; file: string }> }) {
  const { id, file } = await params;
  const found = readUpload(id, file);
  if (!found) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(found.buf), {
    headers: {
      "Content-Type": found.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
