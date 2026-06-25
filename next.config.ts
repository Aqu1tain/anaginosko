import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sortie autonome pour un déploiement Node minimal derrière nginx (VPS).
  output: "standalone",
  // L'audio (~30k mp3) et les données /nt restent servis par nginx, pas par Next.

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
