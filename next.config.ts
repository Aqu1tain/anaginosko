import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sortie autonome pour un déploiement Node minimal derrière nginx (VPS).
  output: "standalone",
  // L'audio (~30k mp3) et les données /nt restent servis par nginx, pas par Next.

  // TEMPORAIRE (durée de la migration) : src/ contient encore du code Vite
  // (import.meta.env) non migré. À retirer en Phase 7 une fois Vite supprimé.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // Review locale : proxifie /api vers le backend AdonisJS local (même origine =
  // pas de CORS). En prod, nginx intercepte /api avant Next, donc ce rewrite
  // n'est jamais atteint — inoffensif. /audio et /nt sont servis depuis public/.
  async rewrites() {
    const api = process.env.API_PROXY ?? "http://localhost:3333";
    return [{ source: "/api/:path*", destination: `${api}/api/:path*` }];
  },
};

export default nextConfig;
