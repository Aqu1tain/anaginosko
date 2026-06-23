import { levelLabel, type Text } from "../data/texts";
import { usePersistentState } from "../hooks/usePersistentState";
import GreekText, { type TranslitMode } from "./GreekText";

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`btn sm:btn-md ${active ? "btn-primary" : "btn-outline border-base-300"}`}
    >
      {children}
    </button>
  );
}

export default function Reader({ text }: { text: Text }) {
  const [mode, setMode] = usePersistentState<TranslitMode>("biblion:translit", "off");

  const hasErasmien = !!text.translitErasmien;
  const hasRestituee = !!text.translitRestituee;

  const set = (m: TranslitMode) => setMode((cur) => (cur === m ? "off" : m));

  return (
    <article className="pt-5">
      <div className="flex items-center gap-2 text-sm text-base-content/60">
        <span className="badge badge-sm badge-ghost">{levelLabel(text.niveau)}</span>
        <span>Touchez une lettre pour ses indices</span>
      </div>

      {(hasErasmien || hasRestituee) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {hasErasmien && (
            <Toggle active={mode === "erasmien"} onClick={() => set("erasmien")}>
              Érasmien
            </Toggle>
          )}
          {hasRestituee && (
            <Toggle active={mode === "restituee"} onClick={() => set("restituee")}>
              Restituée
            </Toggle>
          )}
        </div>
      )}

      <div className="mt-5">
        <GreekText text={text} size="lg" translit={mode} />
      </div>
    </article>
  );
}
