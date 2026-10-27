"use client";

import { useEffect, useState } from "react";
import { EFFORT_LABEL, EFFORTS, fetchModels, providerLabel, type KeyInfo, type ModelInfo, type ModelPick, type ProviderId } from "@/src/lib/aiApi";

// Catalogue des modèles par fournisseur, partagé par tous les sélecteurs de la page.
const catalogs = new Map<ProviderId, Promise<ModelInfo[]>>();
const catalog = (p: ProviderId) => {
  if (!catalogs.has(p))
    catalogs.set(
      p,
      fetchModels(p).catch(() => {
        catalogs.delete(p);
        return [];
      }),
    );
  return catalogs.get(p)!;
};
export const forgetCatalog = (p: ProviderId) => catalogs.delete(p);

type Catalogs = Partial<Record<ProviderId, ModelInfo[]>>;

function useCatalogs(keys: KeyInfo[]) {
  const [lists, setLists] = useState<Catalogs>({});
  const ids = keys.map((k) => k.provider).join(",");
  useEffect(() => {
    let alive = true;
    for (const p of ids.split(",").filter(Boolean) as ProviderId[]) catalog(p).then((m) => alive && setLists((l) => ({ ...l, [p]: m })));
    return () => {
      alive = false;
    };
  }, [ids]);
  return lists;
}

// Modèle (tous fournisseurs confondus) et effort : chaque changement s'applique tout de suite.
export default function ModelPicker({
  keys,
  value,
  onChange,
  pill = false,
}: {
  keys: KeyInfo[];
  value: ModelPick | null;
  onChange: (pick: ModelPick) => void;
  pill?: boolean;
}) {
  const field = pill ? "select select-ghost select-xs w-auto rounded-full font-medium text-base-content/80" : "select select-bordered select-sm";
  const lists = useCatalogs(keys);
  const effort = value?.effort ?? "provider-default";
  const selected = value ? `${value.provider}|${value.model}` : "";

  return (
    <div className={pill ? "flex min-w-0 items-center gap-1" : "grid grid-cols-[minmax(0,1fr)_auto] gap-2"}>
      <select
        value={selected}
        onChange={(e) => {
          const [provider, ...model] = e.target.value.split("|");
          onChange({ provider: provider as ProviderId, model: model.join("|"), effort });
        }}
        className={`${field} min-w-0 ${pill ? "max-w-56" : "w-full"}`}
        aria-label="Modèle"
      >
        {!value && <option value="">Choisir un modèle</option>}
        {keys.map((k) => {
          const models = lists[k.provider];
          const extra = value?.provider === k.provider && models && !models.some((m) => m.id === value.model) ? [{ id: value.model, label: value.model }] : [];
          return (
            <optgroup key={k.provider} label={providerLabel(k.provider)}>
              {!models && value?.provider === k.provider && <option value={selected}>{value.model}</option>}
              {!models && value?.provider !== k.provider && <option disabled>Chargement…</option>}
              {[...extra, ...(models ?? [])].map((m) => (
                <option key={m.id} value={`${k.provider}|${m.id}`}>
                  {m.label}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
      <select
        value={effort}
        onChange={(e) => value && onChange({ ...value, effort: e.target.value as ModelPick["effort"] })}
        disabled={!value}
        className={`${field} ${pill ? "" : "w-40"}`}
        aria-label="Effort"
      >
        {EFFORTS.map((x) => (
          <option key={x} value={x}>
            {EFFORT_LABEL[x]}
          </option>
        ))}
      </select>
    </div>
  );
}
