import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sortie autonome pour un déploiement Node minimal derrière nginx (VPS).
  output: "standalone",
  // L'audio (~30k mp3) et les données /nt restent servis par nginx, pas par Next.

  // TEMPORAIRE (durée de la migration) : src/ contient encore du code Vite
  // (import.meta.env) non migré. À retirer en Phase 7 une fois Vite supprimé.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
