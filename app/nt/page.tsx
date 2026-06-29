import { TocScreen, tocMetadata } from "@/app/_corpus/screens";
import { NT } from "@/src/data/corpus";

export const generateMetadata = () => tocMetadata(NT);

export default function NtTocPage() {
  return <TocScreen corpus={NT} />;
}
