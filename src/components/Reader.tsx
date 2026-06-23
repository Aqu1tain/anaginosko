import { lengthLabel, type Text } from "../data/texts";
import { usePersistentState } from "../hooks/usePersistentState";
import GreekText, { type TranslitMode } from "./GreekText";

function Seg({
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
      className={`btn join-item btn-sm sm:btn-md ${active ? "btn-primary" : "btn-outline border-base-300"}`}
    >
      {children}
    </button>
  );
}

export default function Reader({ text }: { text: Text }) {
  const [manuscript, setManuscript] = usePersistentState<boolean>("anaginosko:manuscript", false);
  const [mode, setMode] = usePersistentState<TranslitMode>("anaginosko:translit", "off");
  const [showFr, setShowFr] = usePersistentState<boolean>("anaginosko:french", false);

  const hasErasmien = !!text.translitErasmien;
  const hasRestituee = !!text.translitRestituee;
  const french = text.francais;
  const hasFrench = !!french && Object.keys(french).length > 0;
  const verses = hasFrench ? Object.keys(french!).map(Number).sort((a, b) => a - b) : [];

  return (
    <article className="pt-5">
      <div className="flex items-center gap-2 text-sm text-base-content/60">
        <span className="badge badge-sm badge-ghost">{lengthLabel(text)}</span>
        <span>Touchez une lettre pour ses indices</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="join">
          <Seg active={!manuscript} onClick={() => setManuscript(false)}>
            Moderne
          </Seg>
          <Seg active={manuscript} onClick={() => setManuscript(true)}>
            Manuscrit
          </Seg>
        </div>

        {(hasErasmien || hasRestituee) && (
          <div className="join">
            <Seg active={mode === "off"} onClick={() => setMode("off")}>
              Grec
            </Seg>
            {hasErasmien && (
              <Seg active={mode === "erasmien"} onClick={() => setMode("erasmien")}>
                Érasmien
              </Seg>
            )}
            {hasRestituee && (
              <Seg active={mode === "restituee"} onClick={() => setMode("restituee")}>
                Restituée
              </Seg>
            )}
          </div>
        )}

        {hasFrench && (
          <button
            onClick={() => setShowFr((v) => !v)}
            aria-pressed={showFr}
            className={`btn btn-sm sm:btn-md ${showFr ? "btn-primary" : "btn-outline border-base-300"}`}
          >
            Français
          </button>
        )}
      </div>

      <div className="mt-5">
        <GreekText text={text} size="lg" translit={mode} manuscript={manuscript} />
      </div>

      {showFr && hasFrench && (
        <div className="mt-6 border-t border-base-300 pt-4">
          <div className="space-y-1 leading-relaxed">
            {verses.map((v) => (
              <p key={v}>
                <span className="verse-num">{v}</span>
                {french![v]}
              </p>
            ))}
          </div>
          <p className="mt-3 text-xs text-base-content/50">Traduction : Louis Segond 1910 (domaine public).</p>
        </div>
      )}
    </article>
  );
}
