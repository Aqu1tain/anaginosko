import type { MetadataRoute } from "next";

const PREPROD = process.env.NEXT_PUBLIC_PREPROD === "1";

// Les variantes ?w= (mot surligné depuis une fiche-lemme) multiplient chaque chapitre
// par des centaines d'URL au contenu identique : seule la page canonique est crawlée.
const DISALLOW = ["/admin", "/login", "/embed/", "/concordance/api/", "/*?w="];

export default function robots(): MetadataRoute.Robots {
  // Préproduction : on n'indexe rien.
  if (PREPROD) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      {
        userAgent: ["GPTBot", "OAI-SearchBot", "ClaudeBot", "Claude-Web", "Google-Extended", "PerplexityBot", "CCBot"],
        allow: "/",
        disallow: DISALLOW,
      },
    ],
    sitemap: "https://anaginosko.fr/sitemap.xml",
    host: "https://anaginosko.fr",
  };
}
