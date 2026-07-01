import type { Metadata } from "next";
import ArbitrageView from "../../../src/components/ArbitrageView";

export const metadata: Metadata = { title: "Arbitrage des liens · Anaginosko", robots: { index: false, follow: false } };

export default function ArbitragePage() {
  return <ArbitrageView />;
}
