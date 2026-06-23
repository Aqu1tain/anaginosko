import { useEffect, useState } from "react";
import { useHashRoute } from "./hooks/useHashRoute";
import { usePersistentState } from "./hooks/usePersistentState";
import { textById } from "./data/texts";
import { SheetContext, type SheetPayload } from "./components/SheetContext";
import TopBar from "./components/TopBar";
import Library from "./components/Library";
import Reader from "./components/Reader";
import AlphabetView from "./components/AlphabetView";
import LetterSheet from "./components/LetterSheet";

const prefersDark =
  typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches;

export default function App() {
  const route = useHashRoute();
  const [dark, setDark] = usePersistentState<boolean>("biblion:dark", prefersDark);
  const [sheet, setSheet] = useState<SheetPayload | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      dark ? "biblion-dark" : "biblion",
    );
  }, [dark]);

  const text = route.name === "text" ? textById(route.id) : undefined;

  return (
    <SheetContext.Provider value={setSheet}>
      <div className="min-h-dvh bg-base-100 text-base-content">
        <TopBar route={route} text={text} dark={dark} onToggleTheme={() => setDark((d) => !d)} />
        <main className="mx-auto w-full max-w-2xl px-4 pb-16">
          {route.name === "library" && <Library />}
          {route.name === "alphabet" && <AlphabetView />}
          {route.name === "text" &&
            (text ? <Reader text={text} /> : <NotFound />)}
        </main>
      </div>
      {sheet && <LetterSheet payload={sheet} onClose={() => setSheet(null)} />}
    </SheetContext.Provider>
  );
}

function NotFound() {
  return (
    <div className="py-20 text-center text-base-content/60">
      <p>Texte introuvable.</p>
      <a href="#/" className="link link-primary mt-3 inline-block">
        Retour à la bibliothèque
      </a>
    </div>
  );
}
