import { TocScreen, tocMetadata } from "@/app/_corpus/screens";
import { LXX } from "@/src/data/corpus";

export const generateMetadata = () => tocMetadata(LXX);

export default function LxxTocPage() {
  return <TocScreen corpus={LXX} />;
}
