import type { Metadata } from "next";
import ArbitrageView from "../../../src/components/ArbitrageView";

export const metadata: Metadata = { title: "Atelier de traduction", robots: { index: false, follow: false } };

export default function ArbitragePage() {
  return <ArbitrageView />;
}
