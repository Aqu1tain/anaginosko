export default function Home() {
  return (
    <main className="min-h-dvh bg-base-100 p-8 text-base-content">
      <h1 className="text-3xl font-bold">Anaginosko — scaffold Next</h1>
      <p className="mt-2 text-base-content/70">Test thème DaisyUI + fonts + breakpoint.</p>
      <p className="font-greek mt-4 text-3xl">Ἐν ἀρχῇ ἦν ὁ λόγος</p>
      <p className="mt-1 text-base-content/60">Inter (sans) — texte de contrôle.</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button className="btn btn-primary">Primary</button>
        <button className="btn btn-accent">Accent</button>
        <span className="badge badge-secondary">badge</span>
        <span className="loading loading-spinner text-primary" />
      </div>
      <p className="mt-4 hidden text-success wide:block">wide: visible (≥ 86rem)</p>
    </main>
  );
}
