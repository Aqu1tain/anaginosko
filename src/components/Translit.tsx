import { translitPieces } from "../lib/greek";

export default function Translit({
  value,
  stressedClass,
  plainClass = "",
}: {
  value: string;
  stressedClass: string;
  plainClass?: string;
}) {
  return (
    <>
      {translitPieces(value).map((p, i) => (
        <span key={i} className={p.stressed ? stressedClass : plainClass}>
          {p.text}
        </span>
      ))}
    </>
  );
}
