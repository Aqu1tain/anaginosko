"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import {
  can,
  fetchContributors,
  inviteContributor,
  updateContributor,
  cancelInvitation,
  fetchRoles,
  saveRole,
  type Contributor,
  type EditorialRole,
} from "@/src/lib/api";
import {
  PERMISSIONS,
  PERMISSION_LABEL,
  PERMISSION_HINT,
  type Permission,
} from "@/src/data/permissions";

function PermissionGrid({
  value,
  onChange,
  disabled = false,
}: {
  value: Permission[];
  onChange: (value: Permission[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {PERMISSIONS.map((p) => (
        <label key={p} className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="checkbox checkbox-sm mt-0.5"
            checked={value.includes(p)}
            disabled={disabled}
            onChange={(e) =>
              onChange(
                e.target.checked ? [...value, p] : value.filter((x) => x !== p),
              )
            }
          />
          <span>
            {PERMISSION_LABEL[p]}
            <span className="mt-0.5 block text-xs text-base-content/60">
              {PERMISSION_HINT[p]}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

function RolePicker({
  roles,
  value,
  onChange,
  disabled = false,
}: {
  roles: EditorialRole[];
  value: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((role) => (
        <label
          key={role.id}
          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${value.includes(role.id) ? "border-primary bg-primary/10" : "border-base-300"}`}
        >
          <input
            className="checkbox checkbox-xs"
            type="checkbox"
            disabled={disabled}
            checked={value.includes(role.id)}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? [...value, role.id]
                  : value.filter((id) => id !== role.id),
              )
            }
          />
          {role.name}
        </label>
      ))}
    </div>
  );
}

function AccountCard({
  account,
  roles,
  self,
  onSaved,
}: {
  account: Contributor;
  roles: EditorialRole[];
  self: boolean;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(account.title);
  const [roleIds, setRoleIds] = useState(account.roleIds ?? []);
  const [permissions, setPermissions] = useState(account.permissions);
  const [active, setActive] = useState(account.active);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const inherited = roles
    .filter((r) => roleIds.includes(r.id))
    .flatMap((r) => r.permissions);
  const effective = account.isRoot
    ? [...PERMISSIONS]
    : [...new Set([...permissions, ...inherited])];
  const changed =
    title !== account.title ||
    active !== account.active ||
    JSON.stringify(roleIds) !== JSON.stringify(account.roleIds ?? []) ||
    JSON.stringify(permissions) !== JSON.stringify(account.permissions);
  const save = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await updateContributor(account.id, {
        title,
        roleIds,
        permissions,
        active,
      });
      await onSaved();
      setNotice("Accès enregistrés.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="space-y-4 rounded-xl border border-base-300 bg-base-100 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">
            {account.displayName}
            {self && " (vous)"}
          </h3>
          <p className="text-sm text-base-content/60">{account.email}</p>
        </div>
        <span
          className={`badge ${account.active ? "badge-success badge-soft" : "badge-error badge-soft"}`}
        >
          {account.isRoot
            ? "Admin racine"
            : account.active
              ? "Actif"
              : "Désactivé"}
        </span>
      </div>
      <fieldset disabled={account.isRoot || busy} className="space-y-4">
        <label className="block text-sm">
          Titre public{" "}
          <span className="text-base-content/50">
            (sans effet sur les droits)
          </span>
          <input
            className="input input-bordered mt-1 w-full"
            value={title}
            maxLength={80}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <div>
          <p className="mb-2 text-sm font-medium">Rôles cumulables</p>
          <RolePicker roles={roles} value={roleIds} onChange={setRoleIds} />
        </div>
        <details>
          <summary className="cursor-pointer text-sm">
            Droits individuels supplémentaires ({permissions.length})
          </summary>
          <p className="my-2 text-xs text-base-content/60">
            Ils s’ajoutent aux rôles. Décocher ici ne retire pas un droit
            accordé par un rôle.
          </p>
          <PermissionGrid value={permissions} onChange={setPermissions} />
        </details>
        {!self && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="toggle toggle-sm"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Compte actif
          </label>
        )}
      </fieldset>
      <details>
        <summary className="cursor-pointer text-sm">
          Droits effectifs ({effective.length})
        </summary>
        <ul className="mt-2 flex flex-wrap gap-2">
          {effective.map((p) => (
            <li key={p} className="badge badge-outline">
              {PERMISSION_LABEL[p]}
            </li>
          ))}
        </ul>
      </details>
      {account.isRoot ? (
        <p className="text-xs text-base-content/60">
          Accès complets. La validation de ses propres articles reste interdite.
        </p>
      ) : (
        <button
          className="btn btn-primary btn-sm"
          disabled={busy || !changed}
          onClick={save}
        >
          {busy ? "Enregistrement…" : "Enregistrer les accès"}
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-success">
          {notice}
        </p>
      )}
    </article>
  );
}

function RoleEditor({
  roles,
  onSaved,
}: {
  roles: EditorialRole[];
  onSaved: () => Promise<void>;
}) {
  const [id, setId] = useState<number | undefined>();
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="space-y-4 rounded-xl border border-base-300 bg-base-100 p-5">
      <h2 className="text-lg font-semibold">Rôles et permissions</h2>
      <p className="text-sm text-base-content/65">
        Un rôle regroupe des droits. Ses modifications s’appliquent à tous les
        comptes et invitations qui le portent.
      </p>
      <label className="block text-sm">
        Rôle à modifier
        <select
          className="select select-bordered mt-1 w-full"
          value={id ?? ""}
          onChange={(e) => {
            const role = roles.find((r) => r.id === Number(e.target.value));
            setId(role?.id);
            setName(role?.name ?? "");
            setPermissions(role?.permissions ?? []);
            setError("");
          }}
        >
          <option value="">Créer un rôle</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Nom du rôle
        <input
          className="input input-bordered mt-1 w-full"
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <PermissionGrid
        value={permissions}
        onChange={setPermissions}
        disabled={busy}
      />
      <button
        className="btn btn-primary btn-sm"
        disabled={busy || !name.trim()}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const role = await saveRole({ id, name, permissions });
            await onSaved();
            setId(role.id);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy
          ? "Enregistrement…"
          : id
            ? "Enregistrer le rôle"
            : "Créer le rôle"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </section>
  );
}

export default function ComptesView() {
  const { user, ready } = useAuth();
  const [data, setData] = useState<Awaited<
    ReturnType<typeof fetchContributors>
  > | null>(null);
  const [roles, setRoles] = useState<EditorialRole[]>([]);
  const [tab, setTab] = useState("accounts");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("Auteur");
  const [roleIds, setRoleIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const reload = async () => {
    const [accounts, availableRoles] = await Promise.all([
      fetchContributors(),
      fetchRoles(),
    ]);
    setData(accounts);
    setRoles(availableRoles);
  };
  const allowed = can(user, "accounts");
  useEffect(() => {
    if (allowed) reload().catch((e) => setError(e.message));
  }, [allowed]);
  if (!ready) return null;
  if (!allowed)
    return <p className="py-12">Accès réservé à la gestion des comptes.</p>;
  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold">Comptes et accès</h1>
        <p className="mt-2 text-base-content/65">
          Inviter l’équipe, attribuer des rôles et comprendre qui peut faire
          quoi.
        </p>
      </div>
      <div className="flex gap-2">
        {[
          ["accounts", "Comptes"],
          ["invite", "Invitations"],
          ["roles", "Rôles et permissions"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={tab === key}
            className={`btn btn-sm ${tab === key ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="alert alert-error text-sm">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-success">
          {notice}
        </p>
      )}
      {!data && !error && <p>Chargement des comptes…</p>}
      {data && tab === "accounts" && (
        <div className="space-y-4">
          {data.users.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              roles={roles}
              self={account.id === user?.id}
              onSaved={reload}
            />
          ))}
        </div>
      )}
      {tab === "roles" && data && <RoleEditor roles={roles} onSaved={reload} />}
      {tab === "invite" && data && (
        <>
          <form
            className="space-y-4 rounded-xl border border-base-300 p-5"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              setNotice("");
              try {
                await inviteContributor({
                  email,
                  displayName: name,
                  title,
                  roleIds,
                  permissions: [],
                });
                await reload();
                setNotice("Invitation envoyée.");
                setEmail("");
                setName("");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <h2 className="font-semibold">Inviter une personne</h2>
            <label className="block text-sm">
              Adresse e-mail
              <input
                type="email"
                className="input input-bordered mt-1 w-full"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Nom d’affichage
              <input
                className="input input-bordered mt-1 w-full"
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Titre public
              <input
                className="input input-bordered mt-1 w-full"
                maxLength={80}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <fieldset disabled={busy}>
              <legend className="mb-2 text-sm">Rôles accordés</legend>
              <RolePicker roles={roles} value={roleIds} onChange={setRoleIds} />
            </fieldset>
            {!roleIds.length && (
              <p className="text-xs text-warning">
                Sans rôle, cette personne pourra se connecter mais n’aura pas
                d’accès éditorial.
              </p>
            )}
            <button disabled={busy} className="btn btn-primary">
              {busy ? "Envoi…" : "Envoyer l’invitation"}
            </button>
          </form>
          <section>
            <h2 className="mb-3 font-semibold">Invitations en attente</h2>
            {!data.invitations.length && (
              <p className="text-sm text-base-content/60">
                Aucune invitation en attente.
              </p>
            )}
            {data.invitations.map((i) => (
              <div
                key={i.id}
                className="mb-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-base-300 p-3 text-sm"
              >
                <div>
                  <p>
                    {i.displayName} · {i.email}
                  </p>
                  <p className="text-xs text-base-content/60">
                    {i.expiresAt && new Date(i.expiresAt) < new Date()
                      ? "Expirée"
                      : "En attente"}{" "}
                    ·{" "}
                    {roles
                      .filter((r) => i.roleIds?.includes(r.id))
                      .map((r) => r.name)
                      .join(", ")}
                  </p>
                </div>
                <button
                  className="btn btn-ghost btn-sm text-error"
                  onClick={async () => {
                    try {
                      await cancelInvitation(i.id);
                      await reload();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Annuler
                </button>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
