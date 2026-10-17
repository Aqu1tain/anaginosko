"use client";

import { useEffect, useState } from "react";
import { deleteKey, fetchUsage, PROVIDERS, providerLabel, saveKey, type KeyInfo, type ProviderId, type Usage } from "@/src/lib/aiApi";
import ModelPicker, { forgetCatalog } from "./ModelPicker";
import { useAiSettings } from "./useAiSettings";

const fr = (n: number) => n.toLocaleString("fr-FR");

// Ajout ou remplacement d'une clé : vérifiée en lisant le catalogue du fournisseur.
function KeyForm({ choices, fixed, onDone, onCancel }: { choices: ProviderId[]; fixed?: ProviderId; onDone: () => void; onCancel?: () => void }) {
  const [provider, setProvider] = useState<ProviderId>(fixed ?? choices[0]);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveKey(provider, apiKey.trim(), provider === "compatible" ? baseUrl.trim() : undefined);
      forgetCatalog(provider);
      setApiKey("");
      onDone();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="grid gap-2 rounded-box bg-base-200/60 p-3 sm:grid-cols-[11rem_minmax(0,1fr)_auto]">
      {fixed ? (
        <span className="self-center text-sm font-medium">{providerLabel(fixed)}</span>
      ) : (
        <select value={provider} onChange={(e) => setProvider(e.target.value as ProviderId)} className="select select-bordered select-sm" aria-label="Fournisseur">
          {choices.map((p) => (
            <option key={p} value={p}>
              {providerLabel(p)}
            </option>
          ))}
        </select>
      )}
      <input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Clé d’API" className="input input-bordered input-sm w-full font-mono" aria-label="Clé d’API" />
      <div className="flex gap-1">
        <button className="btn btn-primary btn-sm" disabled={busy || apiKey.trim().length < 8 || (provider === "compatible" && !baseUrl.trim())}>
          {busy ? "Vérification…" : "Enregistrer"}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            Annuler
          </button>
        )}
      </div>
      {provider === "compatible" && (
        <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="Adresse du serveur : https://…/v1" className="input input-bordered input-sm w-full font-mono sm:col-span-2 sm:col-start-2" />
      )}
      {error && <p className="text-sm text-error sm:col-span-3">{error}</p>}
    </form>
  );
}

function SavedKey({ k, onChanged }: { k: KeyInfo; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  if (editing)
    return (
      <li className="py-2.5">
        <KeyForm
          choices={[k.provider]}
          fixed={k.provider}
          onDone={() => {
            setEditing(false);
            onChanged();
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5">
      <span className="w-40 font-medium">{providerLabel(k.provider)}</span>
      <span className="font-mono text-xs text-base-content/55">{k.keyHint}</span>
      <span className="ml-auto flex gap-1">
        <button type="button" className="btn btn-ghost btn-xs" onClick={() => setEditing(true)}>
          Remplacer
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-xs text-error"
          onClick={() => {
            if (confirm(`Supprimer la clé ${providerLabel(k.provider)} ?`)) deleteKey(k.provider).then(onChanged);
          }}
        >
          Supprimer
        </button>
      </span>
    </li>
  );
}

// Réglages de l'assistant : une clé par fournisseur (jamais réaffichée), modèles et
// efforts, consommation des 30 derniers jours.
export default function AssistantSettings({ onChanged }: { onChanged?: () => void } = {}) {
  const { settings, error, reload: refresh, choose: save } = useAiSettings();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [adding, setAdding] = useState(false);
  const reload = () => {
    refresh();
    onChanged?.();
  };
  const choose: typeof save = (kind, pick) => save(kind, pick).then(onChanged);

  useEffect(() => {
    fetchUsage().then(setUsage).catch(() => {});
  }, []);

  if (!settings) return error ? <p className="text-sm text-error">{error}</p> : <p className="text-sm text-base-content/50">Chargement…</p>;
  const keys = settings.keys;
  const free = PROVIDERS.map((p) => p.id).filter((id) => !keys.some((k) => k.provider === id));
  const showForm = free.length > 0 && (adding || !keys.length);

  return (
    <div className="space-y-8 text-sm">
      <div>
        <h3 className="font-semibold">Clés d’API</h3>
        <p className="mt-0.5 text-xs text-base-content/55">Une par fournisseur, vérifiée puis chiffrée sur le serveur.</p>
        {keys.length > 0 && (
          <ul className="mt-2 divide-y divide-base-300 border-y border-base-300">
            {keys.map((k) => (
              <SavedKey key={k.provider} k={k} onChanged={reload} />
            ))}
          </ul>
        )}
        <div className="mt-3">
          {showForm ? (
            <KeyForm
              key={free.join()}
              choices={free}
              onDone={() => {
                setAdding(false);
                reload();
              }}
              onCancel={keys.length ? () => setAdding(false) : undefined}
            />
          ) : (
            free.length > 0 && (
              <button type="button" className="btn btn-ghost btn-sm -ml-2" onClick={() => setAdding(true)}>
                + Ajouter une clé
              </button>
            )
          )}
        </div>
      </div>

      {keys.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Modèles</h3>
          <div>
            <p className="mb-1 text-xs text-base-content/55">Analyse du grec</p>
            <ModelPicker keys={keys} value={settings.analysis} onChange={(p) => choose("analysis", p)} />
          </div>
          <div>
            <p className="mb-1 text-xs text-base-content/55">Rédaction, relecture et chat</p>
            <ModelPicker keys={keys} value={settings.draft} onChange={(p) => choose("draft", p)} />
          </div>
          {error && <p className="text-error">{error}</p>}
        </div>
      )}

      {usage && usage.models.length > 0 && (
        <div>
          <h3 className="font-semibold">Consommation sur 30 jours</h3>
          <p className="mt-0.5 text-xs text-base-content/55">En jetons.</p>
          <table className="mt-2 w-full">
            <thead className="text-left text-xs text-base-content/50">
              <tr>
                <th className="pb-2 font-medium">Modèle</th>
                <th className="pb-2 text-right font-medium">Appels</th>
                <th className="pb-2 text-right font-medium">Lus</th>
                <th className="hidden pb-2 text-right font-medium sm:table-cell">dont cache</th>
                <th className="pb-2 text-right font-medium">Écrits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-300/70 tabular-nums">
              {usage.models.map((m) => (
                <tr key={m.model}>
                  <td className="max-w-40 truncate py-1.5 pr-3 font-mono text-xs">{m.model}</td>
                  <td className="py-1.5 text-right">{fr(m.runs)}</td>
                  <td className="py-1.5 text-right">{fr(m.input)}</td>
                  <td className="hidden py-1.5 text-right sm:table-cell">{fr(m.cached)}</td>
                  <td className="py-1.5 text-right">{fr(m.output)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
