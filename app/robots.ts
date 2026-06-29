import type { MetadataRoute } from "next";

const PREPROD = process.env.NEXT_PUBLIC_PREPROD === "1";

export default function robots(): MetadataRoute.Robots {
  // Préproduction : on n'indexe rien.
  if (PREPROD) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/login"] },
      {
        userAgent: ["GPTBot", "ClaudeBot", "Claude-Web", "Google-Extended", "PerplexityBot", "CCBot"],
        allow: "/",
        disallow: ["/admin", "/login"],
      },
    ],
    sitemap: "https://anaginosko.fr/sitemap.xml",
    host: "https://anaginosko.fr",
  };
}
