"use client";

import { useEffect, useState } from "react";
import { deleteCredentials, fetchCredentials, fetchUsage, PROVIDERS, saveCredentials, type Credentials, type ProviderId, type Usage } from "@/src/lib/aiApi";

const fr = (n: number) => n.toLocaleString("fr-FR");

// Réglages de l'assistant : clé d'API personnelle (jamais réaffichée), modèles
// d'analyse et de rédaction, consommation des 30 derniers jours.
export default function AssistantSettings() {
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [provider, setProvider] = useState<ProviderId>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const apply = (c: Credentials) => {
    setCreds(c);
    const p = c.provider ?? "anthropic";
    setProvider(p);
    setBaseUrl(c.baseUrl ?? "");
    setAnalysis(c.modelAnalysis ?? c.defaults[p]?.analysis ?? "");
    setDraft(c.modelDraft ?? c.defaults[p]?.draft ?? "");
    setApiKey("");
  };

  useEffect(() => {
    fetchCredentials().then(apply).catch((e) => setMessage({ ok: false, text: e.message }));
    fetchUsage().then(setUsage).catch(() => {});
  }, []);

  const pick = (p: ProviderId) => {
    setProvider(p);
    if (creds?.provider === p) {
      setAnalysis(creds.modelAnalysis ?? "");
      setDraft(creds.modelDraft ?? "");
    } else {
      setAnalysis(creds?.defaults[p]?.analysis ?? "");
      setDraft(creds?.defaults[p]?.draft ?? "");
    }
  };

  const save = async () => {
    setBusy(true);
    setMessage(null);
    try {
      apply(
        await saveCredentials({
          provider,
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
          ...(provider === "compatible" ? { baseUrl: baseUrl.trim() } : {}),
          modelAnalysis: analysis.trim(),
          modelDraft: draft.trim(),
        }),
      );
      setMessage({ ok: true, text: "Clé vérifiée et enregistrée." });
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    }
    setBusy(false);
  };

  const keepsKey = creds?.configured && creds.provider === provider;
  const ready = analysis.trim() && draft.trim() && (apiKey.trim() || keepsKey) && (provider !== "compatible" || baseUrl.trim());

  if (!creds) return message ? <p className="text-sm text-error">{message.text}</p> : <p className="text-sm text-base-content/50">Chargement…</p>;

  return (
    <div className="grid gap-8 wide:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Clé d’API</h2>
        <div className="flex flex-wrap gap-1.5">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p.id)}
              className={`btn btn-sm ${provider === p.id ? "btn-primary" : "btn-outline"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-base-content/55">Clé</span>
          <input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={keepsKey ? `Enregistrée (${creds.keyHint})` : "sk-…"}
            className="input input-bordered input-sm w-full font-mono"
          />
        </label>
        {provider === "compatible" && (
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-base-content/55">Adresse du serveur</span>
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://…/v1" className="input input-bordered input-sm w-full font-mono" />
          </label>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-base-content/55">Modèle d’analyse</span>
            <input value={analysis} onChange={(e) => setAnalysis(e.target.value)} className="input input-bordered input-sm w-full font-mono" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-base-content/55">Modèle de rédaction et de relecture</span>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} className="input input-bordered input-sm w-full font-mono" />
          </label>
        </div>
        <p className="text-xs text-base-content/55">
          La clé est chiffrée sur le serveur et ne quitte plus le serveur. Un appel d’essai la vérifie avant l’enregistrement ; il est facturé par le fournisseur.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-primary btn-sm" disabled={!ready || busy} onClick={save}>
            {busy ? "Vérification…" : "Vérifier et enregistrer"}
          </button>
          {creds.configured && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                if (confirm("Supprimer votre clé d’API ?")) deleteCredentials().then(apply);
              }}
            >
              Supprimer la clé
            </button>
          )}
        </div>
        {message && <p className={`text-sm ${message.ok ? "text-success" : "text-error"}`}>{message.text}</p>}
      </section>

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
