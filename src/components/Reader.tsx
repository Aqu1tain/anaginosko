import { lengthLabel, type Text } from "../data/texts";
import { usePersistentState } from "../hooks/usePersistentState";
import GreekText, { type TranslitMode } from "./GreekText";
import Translit from "./Translit";

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

function TranslitLine({ value }: { value: string }) {
  return (
    <p className="mt-2 text-[1.05rem] italic leading-relaxed text-base-content/70">
      <Translit value={value} stressedClass="font-semibold not-italic text-accent" />
    </p>
  );
}

export default function Reader({ text, highlight }: { text: Text; highlight: number | null }) {
  const [manuscript, setManuscript] = usePersistentState<boolean>("anaginosko:manuscript", false);
  const [mode, setMode] = usePersistentState<TranslitMode>("anaginosko:translit", "off");
  const [showFr, setShowFr] = usePersistentState<boolean>("anaginosko:french", false);

  const hasErasmien = !!text.translitErasmien;
  const hasRestituee = !!text.translitRestituee;
  const french = text.francais;
  const hasFrench = !!french && Object.keys(french).length > 0;
  const verses = hasFrench ? Object.keys(french!).map(Number).sort((a, b) => a - b) : [];
  const study = showFr && hasFrench;

  // En manuscrit, la prononciation s'affiche en ligne continue (pas d'interlinéaire,
  // donc aucun espace ajouté au texte majuscule).
  const showLine = manuscript && mode !== "off";
  const lineFor = (v?: number): string => {
    if (v == null) return (mode === "restituee" ? text.translitRestituee : text.translitErasmien) ?? "";
    return (text.mots ?? [])
      .filter((m) => m.verse === v)
      .map((m) => (mode === "restituee" ? m.restituee : m.erasmien))
      .join(" ");
  };

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

      {study ? (
        <div className="mt-5">
          {verses.map((v) => (
            <div key={v} className="border-b border-base-300/70 py-4 first:pt-0 last:border-0">
              <GreekText
                text={text}
                size="lg"
                translit={mode}
                manuscript={manuscript}
                verseOnly={v}
                highlightWord={highlight}
              />
              {showLine && <TranslitLine value={lineFor(v)} />}
              <p className="mt-2 leading-relaxed text-base-content/85">
                <span className="verse-num">{v}</span>
                {french![v]}
              </p>
            </div>
          ))}
          <p className="mt-3 text-xs text-base-content/50">
            Traduction : Bible Crampon (néo-Crampon, domaine public).
          </p>
        </div>
      ) : (
        <div className="mt-5">
          <GreekText
            text={text}
            size="lg"
            translit={mode}
            manuscript={manuscript}
            highlightWord={highlight}
          />
          {showLine && <TranslitLine value={lineFor()} />}
        </div>
      )}
    </article>
  );
}
