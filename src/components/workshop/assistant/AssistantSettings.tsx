"use client";

import { useEffect, useState } from "react";
import { deleteKey, fetchUsage, PROVIDERS, saveKey, type KeyInfo, type ProviderId, type Usage } from "@/src/lib/aiApi";
import ModelPicker, { forgetCatalog } from "./ModelPicker";
import { useAiSettings } from "./useAiSettings";

const fr = (n: number) => n.toLocaleString("fr-FR");

function ProviderRow({ id, label, saved, onChanged }: { id: ProviderId; label: string; saved?: KeyInfo; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(saved?.baseUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await saveKey(id, apiKey.trim(), id === "compatible" ? baseUrl.trim() : undefined);
      forgetCatalog(id);
      setOpen(false);
      setApiKey("");
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-36 font-medium">{label}</span>
        {saved ? <span className="font-mono text-xs text-base-content/55">clé {saved.keyHint}</span> : <span className="text-xs text-base-content/40">aucune clé</span>}
        <span className="ml-auto flex gap-1">
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => setOpen(!open)}>
            {saved ? "Remplacer" : "Ajouter"}
          </button>
          {saved && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => {
                if (confirm(`Supprimer la clé ${label} ?`)) deleteKey(id).then(onChanged);
              }}
            >
              Supprimer
            </button>
          )}
        </span>
      </div>
      {open && (
        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid gap-2">
            <input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Clé d’API" className="input input-bordered input-sm w-full font-mono" />
            {id === "compatible" && <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://…/v1" className="input input-bordered input-sm w-full font-mono" />}
          </div>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy || apiKey.trim().length < 8 || (id === "compatible" && !baseUrl.trim())} onClick={submit}>
            {busy ? "Vérification…" : "Vérifier et enregistrer"}
          </button>
          {error && <p className="text-sm text-error sm:col-span-2">{error}</p>}
        </div>
      )}
    </li>
  );
}

// Réglages de l'assistant : une clé par fournisseur (jamais réaffichée), modèles et
// efforts par défaut, consommation des 30 derniers jours.
export default function AssistantSettings() {
  const { settings, error, reload, choose } = useAiSettings();
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    fetchUsage().then(setUsage).catch(() => {});
  }, []);

  if (!settings) return error ? <p className="text-sm text-error">{error}</p> : <p className="text-sm text-base-content/50">Chargement…</p>;
  const keys = settings.keys;

  return (
    <div className="grid gap-10 wide:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-10">
        <section>
          <h2 className="text-lg font-semibold">Fournisseurs</h2>
          <ul className="mt-2 divide-y divide-base-300 text-sm">
            {PROVIDERS.map((p) => (
              <ProviderRow key={p.id} id={p.id} label={p.label} saved={keys.find((k) => k.provider === p.id)} onChanged={reload} />
            ))}
          </ul>
          <p className="mt-2 text-xs text-base-content/55">Chaque clé est vérifiée en lisant le catalogue du fournisseur, puis chiffrée sur le serveur.</p>
        </section>

        {keys.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Modèles</h2>
            <div className="text-sm">
              <p className="mb-1 text-xs text-base-content/55">Analyse du grec</p>
              <ModelPicker keys={keys} value={settings.analysis} onChange={(p) => choose("analysis", p)} />
            </div>
            <div className="text-sm">
              <p className="mb-1 text-xs text-base-content/55">Rédaction, relecture et chat</p>
              <ModelPicker keys={keys} value={settings.draft} onChange={(p) => choose("draft", p)} />
            </div>
            {error && <p className="text-sm text-error">{error}</p>}
          </section>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Consommation sur 30 jours</h2>
        {usage?.models.length ? (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-base-content/50">
              <tr>
                <th className="pb-2 font-medium">Modèle</th>
                <th className="pb-2 text-right font-medium">Appels</th>
                <th className="pb-2 text-right font-medium">Lus</th>
                <th className="pb-2 text-right font-medium">dont cache</th>
                <th className="pb-2 text-right font-medium">Écrits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-300/70 tabular-nums">
              {usage.models.map((m) => (
                <tr key={m.model}>
                  <td className="py-1.5 font-mono text-xs">{m.model}</td>
                  <td className="py-1.5 text-right">{fr(m.runs)}</td>
                  <td className="py-1.5 text-right">{fr(m.input)}</td>
                  <td className="py-1.5 text-right">{fr(m.cached)}</td>
                  <td className="py-1.5 text-right">{fr(m.output)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-base-content/50">Aucun appel.</p>
        )}
        <p className="text-xs text-base-content/55">En jetons. Le coût dépend des tarifs de votre fournisseur.</p>
      </section>
    </div>
  );
}
