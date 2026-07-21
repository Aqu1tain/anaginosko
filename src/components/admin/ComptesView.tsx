"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import {
  fetchContributors,
  inviteContributor,
  updateContributor,
  cancelInvitation,
  type Contributor,
  type Invitation,
  type Role,
  type InvitableRole,
} from "@/src/lib/api";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrateur",
  philologist: "Philologue",
  reader: "Lecteur",
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export default function ComptesView() {
  const { user, ready } = useAuth();
  const isAdmin = user?.role === "admin";

  const [users, setUsers] = useState<Contributor[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<InvitableRole>("philologist");
  const [busy, setBusy] = useState(false);

  const reload = () =>
    fetchContributors()
      .then((d) => {
        setUsers(d.users);
        setInvites(d.invitations);
      })
      .catch((e) => setError((e as Error).message));

  useEffect(() => {
    if (isAdmin) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (!ready) return null;
  if (!isAdmin)
    return (
      <div className="py-20 text-center text-base-content/70">
        <p>Accès réservé à l’administration.</p>
        <a href="/login" className="link link-primary mt-3 inline-block">Se connecter</a>
      </div>
    );

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await inviteContributor({ email: email.trim(), displayName: name.trim(), role });
      setNotice(`Invitation envoyée à ${email.trim()}.`);
      setEmail("");
      setName("");
      setRole("philologist");
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id: number, p: { role?: Role; active?: boolean }) => {
    setError(null);
    try {
      await updateContributor(id, p);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const cancel = async (id: number) => {
    setError(null);
    try {
      await cancelInvitation(id);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl pb-16 pt-8">
      <h1 className="text-3xl font-bold tracking-tight">Comptes</h1>
      <p className="mt-1 text-sm text-base-content/60">
        Invitez des contributeurs, gérez leurs rôles et leur accès.
      </p>

      <section className="mt-6 rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <h2 className="font-semibold">Inviter un contributeur</h2>
        <p className="mt-0.5 text-xs text-base-content/55">
          Il recevra un e-mail pour définir son mot de passe et activer son accès.
        </p>
        <form onSubmit={invite} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
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
          <div className="flex gap-2">
            <select value={role} onChange={(e) => setRole(e.target.value as InvitableRole)} className="select select-bordered">
              <option value="philologist">Philologue</option>
              <option value="admin">Administrateur</option>
            </select>
            <button type="submit" disabled={busy} className="btn btn-primary">
              {busy ? "…" : "Inviter"}
            </button>
          </div>
        </form>
        {notice && <p className="mt-3 text-sm text-success">{notice}</p>}
        {error && <p className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
      </section>

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
                <span className="badge badge-ghost badge-sm">{ROLE_LABEL[i.role]}</span>
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
              <div
                key={u.id}
                className={`flex flex-wrap items-center gap-3 rounded-xl border border-base-300 bg-base-100 p-3 ${u.active ? "" : "opacity-60"}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {u.displayName}
                    {self && <span className="ml-1.5 text-xs text-base-content/50">(vous)</span>}
                    {!u.active && <span className="ml-1.5 text-xs text-error">désactivé</span>}
                  </p>
                  <p className="truncate text-xs text-base-content/60">{u.email}</p>
                </div>
                <select
                  value={u.role}
                  disabled={self}
                  onChange={(e) => patch(u.id, { role: e.target.value as Role })}
                  className="select select-bordered select-sm"
                  aria-label={`Rôle de ${u.displayName}`}
                >
                  <option value="philologist">Philologue</option>
                  <option value="admin">Administrateur</option>
                  <option value="reader">Lecteur</option>
                </select>
                {!self &&
                  (u.active ? (
                    <button onClick={() => patch(u.id, { active: false })} className="btn btn-ghost btn-sm text-error">
                      Désactiver
                    </button>
                  ) : (
                    <button onClick={() => patch(u.id, { active: true })} className="btn btn-ghost btn-sm text-success">
                      Réactiver
                    </button>
                  ))}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
