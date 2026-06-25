import type { Metadata, Viewport } from "next";
import "./globals.css";
import { gentium, inter } from "./fonts";
import Providers from "./providers";
import Shell from "./shell";

// Applique le thème (clair/sombre) avant le premier paint pour éviter le flash,
// d'après localStorage("anaginosko:dark") ou la préférence système.
const THEME_INIT = `(function(){try{var s=localStorage.getItem("anaginosko:dark");var d=s===null?matchMedia("(prefers-color-scheme: dark)").matches:JSON.parse(s);document.documentElement.setAttribute("data-theme",d?"anaginosko-dark":"anaginosko");}catch(e){document.documentElement.setAttribute("data-theme","anaginosko");}})();`;

export const metadata: Metadata = {
  metadataBase: new URL("https://anaginosko.fr"),
  title: {
    default: "Anaginosko · lire le grec koinè",
    template: "%s · Anaginosko",
  },
  description:
    "Anaginosko · lire le grec koinè du Nouveau Testament, lettre par lettre, prononciation érasmienne et restituée, alphabet interactif.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Anaginosko", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    siteName: "Anaginosko",
    locale: "fr_FR",
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
    <html lang="fr" className={`${gentium.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
