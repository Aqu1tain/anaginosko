import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sortie autonome pour un déploiement Node minimal derrière nginx (VPS).
  output: "standalone",
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
  },

  // Review locale uniquement : proxifie /api vers le backend AdonisJS local
  // (même origine = pas de CORS). En prod, nginx intercepte /api avant Next ;
  // on n'expose donc pas ce rewrite côté serveur de prod. /audio et /nt sont
  // servis depuis public/ en dev, depuis le disque par nginx en prod.
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    const api = process.env.API_PROXY ?? "http://localhost:3333";
    return [{ source: "/api/:path*", destination: `${api}/api/:path*` }];
  },
};

export default nextConfig;
