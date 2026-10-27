import type { NextConfig } from "next";
import { HTML_LIMITED_BOT_UA_RE } from "next/dist/shared/lib/router/utils/html-bots";

// Robots des assistants IA : ils n'exécutent pas le JavaScript et lisent le <head>.
// Next diffuse les métadonnées des pages dynamiques en fin de flux, sauf pour les
// robots de cette liste, qui reçoivent un rendu bloquant (titre et description dans
// le <head>).
const AI_BOTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "Claude-Web",
  "PerplexityBot", "Perplexity-User", "meta-externalagent", "meta-externalfetcher", "meta-webindexer",
  "Amazonbot", "Amzn-SearchBot", "CCBot", "Bytespider", "MistralAI-User", "DuckAssistBot", "cohere-ai", "YouBot",
  // Audits Lighthouse : voir la page comme un moteur de recherche.
  "Chrome-Lighthouse",
];

// Origines tierces chargées par le navigateur : connexion Google, Matomo. Les scripts
// inline restent permis (Next, JSON-LD) ; le reste est fermé.
const MATOMO = "https://analytics.anaginosko.fr";
const GOOGLE = "https://accounts.google.com";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${GOOGLE} ${MATOMO}`,
  `style-src 'self' 'unsafe-inline' ${GOOGLE}`,
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${GOOGLE} ${MATOMO}`,
  "media-src 'self' blob:",
  "frame-src https:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const production = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Sortie autonome pour un déploiement Node minimal derrière nginx (VPS).
  output: "standalone",
  poweredByHeader: false,
  // next/image n'est pas utilisé : l'optimiseur d'images reste fermé.
  images: { unoptimized: true },
  htmlLimitedBots: new RegExp(`${HTML_LIMITED_BOT_UA_RE.source}|${AI_BOTS.join("|")}`, "i"),
  // L'audio (~30k mp3) et les données /nt restent servis par nginx, pas par Next.

  // Les routes d'arbitrage lisent des données statiques (Giguet immuable, liens,
  // file, états) au runtime : on force leur inclusion dans le bundle standalone.
  outputFileTracingIncludes: {
    "/admin/arbitrage/api/**": [
      "./data/giguet-lxx.json",
      "./data/lxx-links.json",
      "./data/lxx-queue.json",
      "./data/lxx-chapter-state.json",
    ],
    // Les lectures du jour lisent les lectionnaires précalculés au runtime.
    "/lectures": ["./data/lectionnaire/**/*.json"],
    "/lectures/**": ["./data/lectionnaire/**/*.json"],
    // Cours rédigés dans le dépôt, importables depuis l'administration.
    "/admin/cours/api/**": ["./data/cours/*.json"],
    // Les cartes OpenGraph lisent les polices .ttf via fs au runtime (satori
    // n'accepte pas les webfonts) : on force leur inclusion dans le standalone
    // pour chaque route qui génère une image.
    "/opengraph-image": ["./app/_og/*.ttf"],
    "/nt/[book]/opengraph-image": ["./app/_og/*.ttf"],
    "/lxx/[book]/opengraph-image": ["./app/_og/*.ttf"],
    "/nt/[book]/[chapter]/opengraph-image": ["./app/_og/*.ttf"],
    "/lxx/[book]/[chapter]/opengraph-image": ["./app/_og/*.ttf"],
    "/articles/[slug]/opengraph-image": ["./app/_og/*.ttf"],
    "/text/[id]/opengraph-image": ["./app/_og/*.ttf"],
    "/concordance/[lemma]/opengraph-image": ["./app/_og/*.ttf"],
    "/lxx/concordance/[lemma]/opengraph-image": ["./app/_og/*.ttf"],
  },

  // Versions Markdown des chapitres et des fiches-lemme, pour les assistants IA.
  // Review locale : /api est en plus proxifié vers le backend AdonisJS local (même
  // origine = pas de CORS). En prod, nginx intercepte /api avant Next ; /audio et
  // /nt sont servis depuis public/ en dev, depuis le disque par nginx en prod.
  // Un agent qui demande du Markdown (en-tête Accept) le reçoit aussi sur l'URL même
  // de la page ; les navigateurs n'envoient jamais text/markdown.
  async rewrites() {
    const wantsMarkdown = [{ type: "header" as const, key: "accept", value: ".*text/markdown.*" }];
    const markdown = [
      { source: "/concordance/:lemma.md", destination: "/markdown/lemme/nt/:lemma" },
      { source: "/lxx/concordance/:lemma.md", destination: "/markdown/lemme/lxx/:lemma" },
      { source: "/:corpus(nt|lxx)/:book/:chapter(\\d+).md", destination: "/markdown/chapitre/:corpus/:book/:chapter" },
      { source: "/concordance/:lemma", has: wantsMarkdown, destination: "/markdown/lemme/nt/:lemma" },
      { source: "/lxx/concordance/:lemma", has: wantsMarkdown, destination: "/markdown/lemme/lxx/:lemma" },
      { source: "/:corpus(nt|lxx)/:book/:chapter(\\d+)", has: wantsMarkdown, destination: "/markdown/chapitre/:corpus/:book/:chapter" },
    ];
    const api = process.env.API_PROXY ?? "http://localhost:3333";
    const dev = process.env.NODE_ENV === "development" ? [{ source: "/api/:path*", destination: `${api}/api/:path*` }] : [];
    return { beforeFiles: markdown, afterFiles: dev, fallback: [] };
  },

  // Le widget d'intégration peut être encadré par n'importe quel site ; le reste
  // seulement par le site lui-même.
  async headers() {
    if (!production) return [];
    return [
      {
        source: "/((?!embed/).*)",
        headers: [...SECURITY_HEADERS, { key: "Content-Security-Policy", value: `${CSP}; frame-ancestors 'self'` }],
      },
      {
        source: "/embed/:path*",
        headers: [...SECURITY_HEADERS, { key: "Content-Security-Policy", value: `${CSP}; frame-ancestors *` }],
      },
    ];
  },
};

export default nextConfig;
