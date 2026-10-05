import type { Metadata } from "next";
import LecturesView from "./_components/LecturesView";
import { RITES, todayInParis } from "@/lib/lectionnaire";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Lectures du jour en grec",
  description:
    "Les lectures de la messe du jour en grec, Nouveau Testament et Septante, avec la traduction française en regard. Forme ordinaire, forme extraordinaire et rite byzantin.",
  alternates: { canonical: "/lectures" },
};

export default function Page() {
  return <LecturesView rite={RITES[0]} iso={todayInParis()} />;
}
