import type { MetadataRoute } from "next";

const PREPROD = process.env.NEXT_PUBLIC_PREPROD === "1";

// Les variantes ?w= (mot surligné depuis une fiche-lemme) multiplient chaque chapitre
// par des centaines d'URL au contenu identique : seule la page canonique est crawlée.
// /markdown/ est la cible interne des adresses .md, explorables, elles.
const DISALLOW = ["/admin", "/login", "/mon-profil", "/invitation/", "/verify", "/embed/", "/concordance/api/", "/markdown/", "/*?w="];

export default function robots(): MetadataRoute.Robots {
  // Préproduction : on n'indexe rien.
  if (PREPROD) return { rules: [{ userAgent: "*", disallow: "/" }] };
  // Moteurs et assistants (OpenAI, Anthropic, Perplexity, Google, Bing, Meta…) sont
  // tous admis ; leur débit est borné par nginx (deploy/anaginosko-crawlers.conf).
  // Bytespider n'apporte aucune visibilité et ignore les limites : exclu.
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: "Bytespider", disallow: "/" },
    ],
    sitemap: "https://anaginosko.fr/sitemap.xml",
  };
}
