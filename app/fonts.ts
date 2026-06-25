import { Gentium_Plus, Inter } from "next/font/google";

export const gentium = Gentium_Plus({
  subsets: ["greek", "latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-gentium",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});
