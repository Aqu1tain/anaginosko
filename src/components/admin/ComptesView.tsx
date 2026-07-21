"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import {
  can,
  fetchContributors,
  inviteContributor,
  updateContributor,
  cancelInvitation,
  type Contributor,
  type Invitation,
} from "@/src/lib/api";
import { PERMISSIONS, PERMISSION_LABEL, PERMISSION_HINT, PRESETS, type Permission } from "@/src/data/permissions";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function PermissionGrid({
  value,
  onToggle,
  disabled,
}: {
  value: Permission[];
  onToggle: (p: Permission, on: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
      {PERMISSIONS.map((p) => (
        <label
          key={p}
          title={PERMISSION_HINT[p]}
          className={`flex items-center gap-2 text-sm ${disabled ? "cursor-default opacity-70" : "cursor-pointer"}`}
        >
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={value.includes(p)}
            disabled={disabled}
            onChange={(e) => onToggle(p, e.target.checked)}
          />
          {PERMISSION_LABEL[p]}
        </label>
      ))}
    </div>
  );
}

export default function ComptesView() {
  const { user, ready } = useAuth();
  const canManage = can(user, "accounts");

  const [users, setUsers] = useState<Contributor[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState(PRESETS[1].title);
  const [perms, setPerms] = useState<Permission[]>(PRESETS[1].permissions);
  const [busy, setBusy] = useState(false);

  const reload = () =>
    fetchContributors()
      .then((d) => {
        setUsers(d.users);
        setInvites(d.invitations);
      })
      .catch((e) => setError((e as Error).message));

  useEffect(() => {
    if (canManage) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  if (!ready) return null;
  if (!canManage)
    return (
      <div className="py-20 text-center text-base-content/70">
        <p>Accès réservé à la gestion des comptes.</p>
        <a href="/login" className="link link-primary mt-3 inline-block">Se connecter</a>
      </div>
    );

  const applyPreset = (presetTitle: string) => {
    const preset = PRESETS.find((p) => p.title === presetTitle);
    if (!preset) return;
    setTitle(preset.title);
    setPerms([...preset.permissions]);
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await inviteContributor({ email: email.trim(), displayName: name.trim(), title: title.trim(), permissions: perms });
      setNotice(`Invitation envoyée à ${email.trim()}.`);
      setEmail("");
      setName("");
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Écritures par compte, optimistes : on met à jour l'affichage puis on persiste.
  const patchUser = async (u: Contributor, patch: { title?: string; permissions?: Permission[]; active?: boolean }) => {
    setError(null);
    setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, ...patch } : x)));
    try {
      await updateContributor(u.id, patch);
    } catch (err) {
      setError((err as Error).message);
      await reload();
    }
  };

  const togglePerm = (u: Contributor, p: Permission, on: boolean) =>
    patchUser(u, { permissions: on ? [...u.permissions, p] : u.permissions.filter((x) => x !== p) });

  const cancel = async (id: number) => {
    setError(null);
    try {
      await cancelInvitation(id);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-4xl pb-16 pt-8">
      <h1 className="text-3xl font-bold tracking-tight">Comptes</h1>
      <p className="mt-1 text-sm text-base-content/60">
        Invitez des contributeurs, donnez-leur un titre libre et cochez leurs permissions.
      </p>

      <section className="mt-6 rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <h2 className="font-semibold">Inviter un contributeur</h2>
        <p className="mt-0.5 text-xs text-base-content/55">
          Il recevra un e-mail pour définir son mot de passe. Choisissez un préréglage puis ajustez.
        </p>
        <form onSubmit={invite} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e-mail"
              required
              className="input input-bordered w-full"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom d’affichage"
              required
              className="input input-bordered w-full"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2">
              <span className="whitespace-nowrap text-sm text-base-content/60">Préréglage</span>
              <select onChange={(e) => applyPreset(e.target.value)} className="select select-bordered select-sm w-full" defaultValue={PRESETS[1].title}>
                {PRESETS.map((p) => (
                  <option key={p.title} value={p.title}>{p.title}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="whitespace-nowrap text-sm text-base-content/60">Titre</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex. Relectrice" className="input input-bordered input-sm w-full" required />
            </label>
          </div>
          <div className="rounded-lg border border-base-200 bg-base-200/40 p-3">
            <PermissionGrid value={perms} onToggle={(p, on) => setPerms((cur) => (on ? [...cur, p] : cur.filter((x) => x !== p)))} />
          </div>
          <button type="submit" disabled={busy} className="btn btn-primary btn-sm">
            {busy ? "…" : "Inviter"}
          </button>
        </form>
        {notice && <p className="mt-3 text-sm text-success">{notice}</p>}
      </section>

      {error && <div className="alert alert-error mt-4 text-sm">{error}</div>}

      {invites.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-base-content/70">Invitations en attente</h2>
          <div className="mt-2 grid gap-2">
            {invites.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-base-300 bg-base-100 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{i.displayName}</p>
                  <p className="truncate text-xs text-base-content/60">{i.email}</p>
                </div>
                <span className="badge badge-ghost badge-sm">{i.title}</span>
                <span className="text-xs text-base-content/50">expire le {formatDate(i.expiresAt)}</span>
                <button onClick={() => cancel(i.id)} className="btn btn-ghost btn-xs text-error">Annuler</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-base-content/70">Comptes ({users.length})</h2>
        <div className="mt-2 grid gap-2">
          {users.map((u) => {
            const self = u.id === user?.id;
            return (
              <div key={u.id} className={`rounded-xl border border-base-300 bg-base-100 p-4 ${u.active ? "" : "opacity-60"}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {u.displayName}
                      {self && <span className="ml-1.5 text-xs text-base-content/50">(vous)</span>}
                      {u.isRoot && <span className="ml-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">Racine</span>}
                      {!u.active && <span className="ml-1.5 text-xs text-error">désactivé</span>}
                    </p>
                    <p className="truncate text-xs text-base-content/60">{u.email}</p>
                  </div>
                  {u.isRoot ? (
                    <span className="text-sm text-base-content/60">{u.title}</span>
                  ) : (
                    <>
                      <input
                        defaultValue={u.title}
                        onBlur={(e) => e.target.value.trim() !== u.title && patchUser(u, { title: e.target.value.trim() })}
                        aria-label={`Titre de ${u.displayName}`}
                        className="input input-bordered input-sm w-40"
                      />
                      {!self &&
                        (u.active ? (
                          <button onClick={() => patchUser(u, { active: false })} className="btn btn-ghost btn-sm text-error">Désactiver</button>
                        ) : (
                          <button onClick={() => patchUser(u, { active: true })} className="btn btn-ghost btn-sm text-success">Réactiver</button>
                        ))}
                    </>
                  )}
                </div>
                <div className="mt-3 border-t border-base-200 pt-3">
                  <PermissionGrid
                    value={u.isRoot ? [...PERMISSIONS] : u.permissions}
                    onToggle={(p, on) => togglePerm(u, p, on)}
                    disabled={u.isRoot}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
