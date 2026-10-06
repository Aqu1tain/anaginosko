import type { Metadata, Viewport } from "next";
import "./globals.css";
import { gentium, inter, syne } from "./fonts";
import Providers from "./providers";
import Shell from "./shell";
import { SITE_PITCH } from "../lib/seo";

// Applique le thème (clair/sombre) avant le premier paint pour éviter le flash,
// d'après localStorage("anaginosko:dark") ou la préférence système.
const THEME_INIT = `(function(){try{var s=localStorage.getItem("anaginosko:dark");var d=s===null?matchMedia("(prefers-color-scheme: dark)").matches:JSON.parse(s);document.documentElement.setAttribute("data-theme",d?"anaginosko-dark":"anaginosko");}catch(e){document.documentElement.setAttribute("data-theme","anaginosko");}})();`;

const PREPROD = process.env.NEXT_PUBLIC_PREPROD === "1";

export const metadata: Metadata = {
  metadataBase: new URL("https://anaginosko.fr"),
  robots: PREPROD ? { index: false, follow: false } : undefined,
  title: {
    default: "Anaginosko · la Bible en grec et en français, mot à mot",
    template: "%s · Anaginosko",
  },
  description: SITE_PITCH,
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Anaginosko", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    siteName: "Anaginosko",
    locale: "fr_FR",
  },
  // Sans titre ni description ici : X reprend ceux d'Open Graph, propres à chaque page.
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#16181d" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${gentium.variable} ${inter.variable} ${syne.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": "https://anaginosko.fr/#website",
                  name: "Anaginosko",
                  alternateName: "Ἀναγινώσκω",
                  url: "https://anaginosko.fr",
                  inLanguage: "fr",
                  description: SITE_PITCH,
                  isAccessibleForFree: true,
                  publisher: { "@id": "https://anaginosko.fr/#organization" },
                  potentialAction: {
                    "@type": "SearchAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate: "https://anaginosko.fr/concordance?q={search_term_string}",
                    },
                    "query-input": "required name=search_term_string",
                  },
                },
                {
                  "@type": "Organization",
                  "@id": "https://anaginosko.fr/#organization",
                  name: "Anaginosko",
                  url: "https://anaginosko.fr",
                  description: SITE_PITCH,
                  logo: "https://anaginosko.fr/apple-touch-icon.png",
                  sameAs: [
                    "https://github.com/Aqu1tain/anaginosko",
                    "https://fr.tipeee.com/anaginosko",
                  ],
                },
              ],
            }),
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
