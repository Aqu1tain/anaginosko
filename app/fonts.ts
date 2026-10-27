import { Gentium_Plus, Inter, Syne } from "next/font/google";

export const syne = Syne({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-syne",
  display: "swap",
  preload: false,
});

// Seul le grec courant est préchargé, polytonique compris (greek-ext) : c'est le
// texte du lecteur. Gras et italique arrivent à la demande.
export const gentium = Gentium_Plus({
  subsets: ["greek", "greek-ext", "latin"],
  weight: "400",
  style: "normal",
  variable: "--font-gentium",
  display: "swap",
});

export const gentiumAccents = Gentium_Plus({
  subsets: ["greek", "greek-ext", "latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-gentium-accents",
  display: "swap",
  preload: false,
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});
