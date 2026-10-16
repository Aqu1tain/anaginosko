"use client";

import { useEffect, useState } from "react";
import Avatar from "@/src/components/profile/Avatar";
import { updateContributor, type EditorialRole } from "@/src/lib/api";
import { PERMISSIONS, PERMISSION_LABEL, type Permission } from "@/src/data/permissions";
import { day, relative } from "./format";

export type PanelAccount = {
  id: number;
  email: string;
  displayName: string;
  title: string;
  roleIds: number[];
  permissions: Permission[];
  isRoot: boolean;
  active: boolean;
  createdAt: string | null;
  lastSeenAt?: string | null;
  newsletter?: boolean;
};

const sameSet = (a: (string | number)[], b: (string | number)[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

// Fiche d'un compte, en panneau latéral : identité, rôles cumulables, droits à la
// carte (repliés), puis la désactivation à part, en bas.
export default function AccountPanel({
  account,
  roles,
  self,
  onClose,
  onSaved,
}: {
  account: PanelAccount;
  roles: EditorialRole[];
  self: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(account.title);
  const [roleIds, setRoleIds] = useState(account.roleIds);
  const [permissions, setPermissions] = useState(account.permissions);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const inherited = new Set(roles.filter((r) => roleIds.includes(r.id)).flatMap((r) => r.permissions));
  const effective = account.isRoot ? [...PERMISSIONS] : PERMISSIONS.filter((p) => inherited.has(p) || permissions.includes(p));
  const staff = account.isRoot || roleIds.length > 0 || permissions.length > 0;
  const changed = title !== account.title || !sameSet(roleIds, account.roleIds) || !sameSet(permissions, account.permissions);
  const locked = account.isRoot || busy;

  const run = async (patch: Parameters<typeof updateContributor>[1]) => {
    setBusy(true);
    setError("");
    try {
      await updateContributor(account.id, patch);
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const toggle = <T,>(list: T[], item: T, on: boolean) => (on ? [...list, item] : list.filter((x) => x !== item));

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="account-panel-title">
      <button type="button" aria-label="Fermer" className="absolute inset-0 bg-base-content/30" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-base-100 shadow-2xl">
        <header className="flex items-start gap-3 border-b border-base-300 p-5">
          <Avatar name={account.displayName} photo={null} size={44} />
          <div className="min-w-0 flex-1">
            <h2 id="account-panel-title" className="truncate text-lg font-semibold">
              {account.displayName}
              {self && <span className="font-normal text-base-content/55"> (vous)</span>}
            </h2>
            <p className="truncate text-sm text-base-content/60">{account.email}</p>
            <p className="mt-1 text-xs text-base-content/50">
              Inscrit le {day(account.createdAt)}
              {account.lastSeenAt && ` · actif ${relative(account.lastSeenAt)}`}
              {account.newsletter && " · reçoit les nouveautés"}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="btn btn-ghost btn-sm btn-circle">
            ✕
          </button>
        </header>

        <div className="flex-1 space-y-6 p-5">
          {account.isRoot && (
            <p className="rounded-lg bg-base-200 px-3 py-2 text-sm">Administrateur racine : tous les droits, non modifiable.</p>
          )}

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/55">Rôles</h3>
            <ul className="divide-y divide-base-300 rounded-box border border-base-300">
              {roles.map((role) => (
                <li key={role.id}>
                  <label className={`flex items-start gap-3 px-3 py-2.5 ${locked ? "" : "cursor-pointer hover:bg-base-200/60"}`}>
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary mt-0.5"
                      disabled={locked}
                      checked={account.isRoot || roleIds.includes(role.id)}
                      onChange={(e) => setRoleIds(toggle(roleIds, role.id, e.target.checked))}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{role.name}</span>
                      <span className="block text-xs text-base-content/55">
                        {role.permissions.map((p) => PERMISSION_LABEL[p]).join(", ") || "Aucun droit"}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          {staff && (
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-base-content/55">Titre public</span>
              <input
                className="input input-bordered input-sm mt-2 w-full"
                value={title}
                maxLength={80}
                disabled={locked}
                placeholder="Auteur, Philologue…"
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
          )}

          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-base-content/70">
              Droits à la carte{permissions.length > 0 && ` (${permissions.length})`}
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {PERMISSIONS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    disabled={locked}
                    checked={account.isRoot || permissions.includes(p)}
                    onChange={(e) => setPermissions(toggle(permissions, p, e.target.checked))}
                  />
                  <span className={inherited.has(p) ? "text-base-content/50" : ""}>{PERMISSION_LABEL[p]}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-base-content/50">En gris : déjà accordé par un rôle.</p>
          </details>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/55">
              Droits effectifs ({effective.length})
            </h3>
            {effective.length ? (
              <ul className="flex flex-wrap gap-1.5">
                {effective.map((p) => (
                  <li key={p} className="rounded-full bg-base-200 px-2.5 py-0.5 text-xs">
                    {PERMISSION_LABEL[p]}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-base-content/55">Lecteur, sans accès à l’administration.</p>
            )}
          </section>

          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
        </div>

        {!account.isRoot && (
          <footer className="space-y-3 border-t border-base-300 p-5">
            <div className="flex gap-2">
              <button type="button" className="btn btn-primary btn-sm" disabled={busy || !changed} onClick={() => run({ title, roleIds, permissions })}>
                {busy ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                Fermer
              </button>
            </div>
            {!self && (
              <div className="flex items-center justify-between gap-3 rounded-box border border-error/30 px-3 py-2.5">
                <span className="text-sm">{account.active ? "Bloquer la connexion" : "Compte désactivé"}</span>
                <button
                  type="button"
                  disabled={busy}
                  className={`btn btn-sm ${account.active ? "btn-outline btn-error" : "btn-outline"}`}
                  onClick={() => {
                    if (account.active && !window.confirm(`Désactiver ${account.displayName} ? Ses sessions seront fermées.`)) return;
                    run({ active: !account.active });
                  }}
                >
                  {account.active ? "Désactiver" : "Réactiver"}
                </button>
              </div>
            )}
          </footer>
        )}
      </aside>
    </div>
  );
}
