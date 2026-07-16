// Réduit une image côté client (canvas vers WebP, côté max 1600 px, cible sous 900 Ko)
// pour passer sous le client_max_body_size 1 Mo de nginx en préprod. Repli sur le
// fichier d'origine si la conversion échoue.
const MAX_SIDE = 1600;
const TARGET_BYTES = 900_000;
const QUALITIES = [0.82, 0.7, 0.6, 0.5];

export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  for (const quality of QUALITIES) {
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", quality));
    if (blob && (blob.size <= TARGET_BYTES || quality === QUALITIES[QUALITIES.length - 1])) return blob;
  }
  return file;
}
