"use client";

import { useEffect, useState } from "react";
import Avatar from "@/src/components/profile/Avatar";
import { updateContributor, type EditorialRole } from "@/src/lib/api";
import { PERMISSIONS, type Permission } from "@/src/data/permissions";
import { PermissionList, RoleChips } from "./parts";
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

  const chosen = roles.filter((r) => roleIds.includes(r.id));
  const grantedBy = (p: Permission) => chosen.filter((r) => r.permissions.includes(p)).map((r) => r.name);
  const effective = account.isRoot ? [...PERMISSIONS] : PERMISSIONS.filter((p) => grantedBy(p).length || permissions.includes(p));
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
              {self && <span className="font-normal text-base-content/50"> (vous)</span>}
            </h2>
            <p className="truncate text-sm text-base-content/70">{account.email}</p>
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
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-base-content/50">Rôles</h3>
            {account.isRoot ? (
              <p className="text-sm text-base-content/70">Administrateur racine</p>
            ) : (
              <RoleChips roles={roles} value={roleIds} onChange={setRoleIds} disabled={locked} />
            )}
          </section>

          {staff && (
            <label className="block">
              <span className="block text-xs font-semibold uppercase tracking-wider text-base-content/50">Titre public</span>
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

          <section>
            <h3 className="mb-3 flex items-baseline justify-between text-xs font-semibold uppercase tracking-wider text-base-content/50">
              Droits
              <span className="font-normal normal-case tracking-normal">
                {effective.length} sur {PERMISSIONS.length}
              </span>
            </h3>
            <PermissionList
              isOn={(p) => account.isRoot || permissions.includes(p)}
              via={account.isRoot ? () => [] : grantedBy}
              onToggle={(p, on) => setPermissions(toggle(permissions, p, on))}
              disabled={locked}
            />
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
