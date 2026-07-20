import { ImageResponse } from "next/og";
import { ogFonts } from "./fonts";

// Fabrique partagée des cartes OpenGraph par référence (passage, article, lemme).
// Reprend l'identité de app/opengraph-image.tsx (dégradé sombre, wordmark Syne) et
// rend le grec en Gentium. Runtime nodejs (lecture de polices via fs).

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// Les cartes changent rarement : les scrapers (Facebook, X…) peuvent les garder.
const CACHE = "public, max-age=86400, stale-while-revalidate=604800";
const BG = "linear-gradient(135deg, #0f1b2d 0%, #16263f 100%)";

const truncate = (s: string, n: number): string =>
  s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;

function Badge({ text, color = "#7fa8d0" }: { text: string; color?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        fontSize: 26,
        fontWeight: 600,
        letterSpacing: 2,
        color,
        border: `2px solid ${color}`,
        borderRadius: 999,
        padding: "6px 22px",
      }}
    >
      {text.toUpperCase()}
    </div>
  );
}

function Frame({
  badge,
  footerRight,
  children,
}: {
  badge: React.ReactNode;
  footerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: 80,
        fontFamily: "Inter",
        background: BG,
        color: "#f8fafc",
      }}
    >
      <div style={{ display: "flex" }}>{badge}</div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
        {children}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "Syne", fontSize: 40, fontWeight: 800, letterSpacing: -2 }}>
          Anaginosko
        </div>
        {footerRight ? <div style={{ display: "flex", fontSize: 28, color: "#cbd5e1" }}>{footerRight}</div> : <div />}
      </div>
    </div>
  );
}

const respond = async (element: React.ReactElement): Promise<ImageResponse> =>
  new ImageResponse(element, { ...OG_SIZE, fonts: await ogFonts(), headers: { "Cache-Control": CACHE } });

export function passageCard(opts: { refLabel: string; corpusLabel: string; greek: string | null }) {
  return respond(
    <Frame badge={<Badge text={opts.corpusLabel} />}>
      <div style={{ fontSize: 66, fontWeight: 600, letterSpacing: -1 }}>{opts.refLabel}</div>
      {opts.greek ? (
        <div style={{ fontFamily: "Gentium", fontSize: 46, lineHeight: 1.4, marginTop: 30, color: "#cbd5e1" }}>
          {truncate(opts.greek, 150)}
        </div>
      ) : null}
    </Frame>,
  );
}

export function articleCard(opts: { category: string; title: string; excerpt: string; author: string | null }) {
  return respond(
    <Frame badge={<Badge text={opts.category} color="#e2a04a" />} footerRight={opts.author}>
      <div style={{ fontSize: 72, fontWeight: 600, lineHeight: 1.1, letterSpacing: -1 }}>
        {truncate(opts.title, 90)}
      </div>
      {opts.excerpt ? (
        <div style={{ fontSize: 34, marginTop: 28, color: "#94a3b8", lineHeight: 1.35 }}>
          {truncate(opts.excerpt, 165)}
        </div>
      ) : null}
    </Frame>,
  );
}

export function lemmaCard(opts: { lemma: string; translit: string | null; gloss: string | null; corpusLabel: string }) {
  return respond(
    <Frame badge={<Badge text={opts.corpusLabel} />}>
      <div style={{ fontFamily: "Gentium", fontWeight: 700, fontSize: 112, lineHeight: 1 }}>{opts.lemma}</div>
      {opts.translit ? (
        <div style={{ fontSize: 34, marginTop: 18, color: "#7fa8d0" }}>{opts.translit}</div>
      ) : null}
      {opts.gloss ? (
        <div style={{ fontSize: 34, marginTop: 26, color: "#cbd5e1", lineHeight: 1.35 }}>
          {truncate(opts.gloss, 150)}
        </div>
      ) : null}
    </Frame>,
  );
}
