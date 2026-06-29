import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Anaginosko, lire le grec koinè de la Bible";

export default async function Image() {
  const dir = join(process.cwd(), "app/_og");
  const [syne, inter, interSemi] = await Promise.all([
    readFile(join(dir, "Syne-ExtraBold.ttf")),
    readFile(join(dir, "Inter-Regular.ttf")),
    readFile(join(dir, "Inter-SemiBold.ttf")),
  ]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 96,
          fontFamily: "Inter",
          background: "linear-gradient(135deg, #0f1b2d 0%, #16263f 100%)",
          color: "#f8fafc",
        }}
      >
        <div style={{ fontFamily: "Syne", fontSize: 110, fontWeight: 800, letterSpacing: -4 }}>
          Anaginosko
        </div>
        <div style={{ fontSize: 46, fontWeight: 600, marginTop: 24, color: "#cbd5e1" }}>
          Lire le grec koinè de la Bible, lettre par lettre
        </div>
        <div style={{ fontSize: 30, marginTop: 56, color: "#7fa8d0" }}>
          Prononciation érasmienne et restituée · concordance · alphabet
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Syne", data: syne, weight: 800, style: "normal" },
        { name: "Inter", data: inter, weight: 400, style: "normal" },
        { name: "Inter", data: interSemi, weight: 600, style: "normal" },
      ],
    },
  );
}
