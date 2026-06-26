import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Anaginosko, lire le grec koinè du Nouveau Testament";

export default function Image() {
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
          background: "linear-gradient(135deg, #0f1b2d 0%, #16263f 100%)",
          color: "#f8fafc",
        }}
      >
        <div style={{ fontSize: 120, fontWeight: 800, letterSpacing: -3 }}>Anaginosko</div>
        <div style={{ fontSize: 46, marginTop: 24, color: "#cbd5e1" }}>
          Lire le grec koinè du Nouveau Testament, lettre par lettre
        </div>
        <div style={{ fontSize: 30, marginTop: 56, color: "#7fa8d0" }}>
          Prononciation érasmienne et restituée · concordance · alphabet
        </div>
      </div>
    ),
    size,
  );
}
