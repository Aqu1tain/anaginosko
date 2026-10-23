"use client";

import { useState } from "react";
import { saveRole, type EditorialRole } from "@/src/lib/api";
import type { Permission } from "@/src/data/permissions";
import { PermissionList, RoleDot } from "./parts";

type Draft = { id?: number; name: string; permissions: Permission[] };

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

// Rôles à la Discord : la liste à gauche, l'édition du rôle choisi à droite.
export default function RolesView({
  roles,
  members,
  onSaved,
}: {
  roles: EditorialRole[];
  members: (roleId: number) => number;
  onSaved: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft | null>(roles[0] ? { ...roles[0] } : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const original = roles.find((r) => r.id === draft?.id);
  const changed = !!draft && (!original || original.name !== draft.name || !sameSet(original.permissions, draft.permissions));

  const pick = (d: Draft) => {
    if (changed && !window.confirm("Abandonner les modifications de ce rôle ?")) return;
    setError("");
    setDraft(d);
  };

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const role = await saveRole(draft);
      await onSaved();
      setDraft({ ...role });
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div className="grid gap-6 overflow-hidden rounded-box border border-base-300 bg-base-100 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-0">
      <nav className="border-base-300 p-2 md:border-r" aria-label="Rôles">
        <ul className="space-y-0.5">
          {roles.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                aria-current={draft?.id === r.id ? "true" : undefined}
                onClick={() => pick({ ...r })}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm ${draft?.id === r.id ? "bg-base-200 font-medium" : "hover:bg-base-200/60"}`}
              >
                <RoleDot id={r.id} />
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                <span className="text-xs tabular-nums text-base-content/50">{members(r.id)}</span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => pick({ name: "", permissions: [] })} className="mt-2 w-full rounded-md px-2.5 py-2 text-left text-sm text-primary hover:bg-base-200/60">
          + Créer un rôle
        </button>
      </nav>

      {draft && (
        <div className="space-y-6 p-5">
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wider text-base-content/50">Nom du rôle</span>
            <input
              className="input input-bordered input-sm mt-2 w-full max-w-xs"
              value={draft.name}
              maxLength={80}
              placeholder="Nouveau rôle"
              autoFocus={!draft.id}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <PermissionList
            isOn={(p) => draft.permissions.includes(p)}
            onToggle={(p, on) => setDraft({ ...draft, permissions: on ? [...draft.permissions, p] : draft.permissions.filter((x) => x !== p) })}
            disabled={busy}
          />
          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
          {changed && (
            <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-box bg-neutral px-4 py-2.5 text-sm text-neutral-content shadow-lg">
              <span>{draft.id ? `Modifications non enregistrées · ${members(draft.id)} compte(s) concerné(s)` : "Nouveau rôle"}</span>
              <span className="flex gap-2">
                <button type="button" className="btn btn-ghost btn-sm text-neutral-content" onClick={() => setDraft(original ? { ...original } : roles[0] ? { ...roles[0] } : null)}>
                  Annuler
                </button>
                <button type="button" className="btn btn-primary btn-sm" disabled={busy || !draft.name.trim()} onClick={save}>
                  {busy ? "Enregistrement…" : "Enregistrer"}
                </button>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
