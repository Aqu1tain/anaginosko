import type { Metadata, Viewport } from "next";
import "./globals.css";
import { gentium, inter, syne } from "./fonts";
import Providers from "./providers";
import Shell from "./shell";

// Applique le thème (clair/sombre) avant le premier paint pour éviter le flash,
// d'après localStorage("anaginosko:dark") ou la préférence système.
const THEME_INIT = `(function(){try{var s=localStorage.getItem("anaginosko:dark");var d=s===null?matchMedia("(prefers-color-scheme: dark)").matches:JSON.parse(s);document.documentElement.setAttribute("data-theme",d?"anaginosko-dark":"anaginosko");}catch(e){document.documentElement.setAttribute("data-theme","anaginosko");}})();`;

const PREPROD = process.env.NEXT_PUBLIC_PREPROD === "1";

export const metadata: Metadata = {
  metadataBase: new URL("https://anaginosko.fr"),
  robots: PREPROD ? { index: false, follow: false } : undefined,
  title: {
    default: "Anaginosko · lire le grec koinè",
    template: "%s · Anaginosko",
  },
  description:
    "Anaginosko · lire le grec koinè de la Bible, lettre par lettre, prononciation érasmienne et restituée, alphabet interactif.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Anaginosko", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    siteName: "Anaginosko",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: { default: "Anaginosko · lire le grec koinè", template: "%s · Anaginosko" },
    description:
      "Lire le grec koinè de la Bible, lettre par lettre : prononciation érasmienne et restituée, concordance, alphabet.",
  },
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
                  name: "Anaginosko",
                  url: "https://anaginosko.fr",
                  inLanguage: "fr",
                  description:
                    "Lire le grec koinè de la Bible, lettre par lettre : prononciation érasmienne et restituée, alphabet interactif, concordance.",
                  potentialAction: {
                    "@type": "SearchAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate: "https://anaginosko.fr/concordance/{search_term_string}",
                    },
                    "query-input": "required name=search_term_string",
                  },
                },
                { "@type": "Organization", name: "Anaginosko", url: "https://anaginosko.fr" },
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
