"use client";

import { useState } from "react";
import { saveRole, type EditorialRole } from "@/src/lib/api";
import { PERMISSIONS, PERMISSION_HINT, PERMISSION_LABEL, type Permission } from "@/src/data/permissions";

type Draft = { id?: number; name: string; permissions: Permission[] };

// Tableau comparatif des rôles (droits en lignes, rôles en colonnes). Cliquer un
// rôle l'ouvre en édition ; les changements valent pour tous ses titulaires.
export default function RolesMatrix({ roles, onSaved }: { roles: EditorialRole[]; onSaved: () => Promise<void> }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      await saveRole(draft);
      await onSaved();
      setDraft(null);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const columns: Draft[] = draft && !draft.id ? [...roles, draft] : roles.map((r) => (draft?.id === r.id ? draft : r));

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-box border border-base-300">
        <table className="table table-sm">
          <thead>
            <tr>
              <th className="min-w-48">Droit</th>
              {columns.map((r) => (
                <th key={r.id ?? "new"} className="text-center">
                  {draft && (draft.id === r.id) ? (
                    <input
                      autoFocus
                      className="input input-bordered input-xs w-32"
                      placeholder="Nom du rôle"
                      value={draft.name}
                      maxLength={80}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    />
                  ) : (
                    <button
                      type="button"
                      className="font-semibold hover:text-primary"
                      title="Modifier ce rôle"
                      onClick={() => setDraft({ id: r.id, name: r.name, permissions: r.permissions })}
                    >
                      {r.name}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p) => (
              <tr key={p}>
                <td>
                  <span className="block font-medium">{PERMISSION_LABEL[p]}</span>
                  <span className="block text-xs text-base-content/55">{PERMISSION_HINT[p]}</span>
                </td>
                {columns.map((r) => {
                  const on = r.permissions.includes(p);
                  const editing = draft && draft.id === r.id;
                  return (
                    <td key={r.id ?? "new"} className="text-center">
                      {editing ? (
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm checkbox-primary"
                          aria-label={`${PERMISSION_LABEL[p]} pour ${draft.name || "le nouveau rôle"}`}
                          checked={on}
                          onChange={(e) =>
                            setDraft({ ...draft, permissions: e.target.checked ? [...draft.permissions, p] : draft.permissions.filter((x) => x !== p) })
                          }
                        />
                      ) : on ? (
                        <span className="text-primary" aria-label="Oui">●</span>
                      ) : (
                        <span className="text-base-content/20" aria-label="Non">·</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {draft ? (
          <>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy || !draft.name.trim()} onClick={save}>
              {busy ? "Enregistrement…" : draft.id ? "Enregistrer le rôle" : "Créer le rôle"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(null)}>
              Annuler
            </button>
            {draft.id && <span className="text-xs text-base-content/55">S’applique à tous les comptes qui ont ce rôle.</span>}
          </>
        ) : (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setDraft({ name: "", permissions: [] })}>
            Nouveau rôle
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
