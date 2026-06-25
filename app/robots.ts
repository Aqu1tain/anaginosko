import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
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
