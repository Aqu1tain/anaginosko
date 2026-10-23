"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import Avatar from "@/src/components/profile/Avatar";
import {
  can,
  cancelInvitation,
  fetchContributors,
  fetchLearners,
  fetchRoles,
  type Contributor,
  type EditorialRole,
  type Invitation,
  type Learner,
} from "@/src/lib/api";
import AccountPanel, { type PanelAccount } from "./accounts/AccountPanel";
import InviteDialog, { type InviteDraft } from "./accounts/InviteDialog";
import RolesView from "./accounts/RolesView";
import { day, matches, relative, roleNamesOf } from "./accounts/format";
import { RolePill } from "./accounts/parts";

type Tab = "team" | "learners" | "invitations" | "roles";
type Team = { users: Contributor[]; invitations: Invitation[]; learners: number };
type Learners = { items: Learner[]; total: number; pageSize: number; page: number };

const asPanel = (a: Contributor | Learner): PanelAccount =>
  "roleIds" in a
    ? a
    : { ...a, title: "", roleIds: [], permissions: [], isRoot: false };

function Row({ name, sub, badges, meta, onClick }: { name: ReactNode; sub: string; badges?: ReactNode; meta?: ReactNode; onClick?: () => void }) {
  const body = (
    <>
      <Avatar name={typeof name === "string" ? name : sub} photo={null} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{name}</span>
        <span className="block truncate text-sm text-base-content/50">{sub}</span>
      </span>
      {badges && <span className="hidden flex-wrap justify-end gap-1.5 sm:flex">{badges}</span>}
      {meta && <span className="shrink-0 text-right text-xs text-base-content/50 sm:w-28">{meta}</span>}
    </>
  );
  const cls = "flex w-full items-center gap-3 px-4 py-3 text-left";
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} transition-colors hover:bg-base-200/60`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

const Badge = ({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "primary" | "error" }) => (
  <span
    className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${tone === "primary" ? "bg-primary/10 text-primary" : tone === "error" ? "bg-error/10 text-error" : "bg-base-200 text-base-content/70"}`}
  >
    {children}
  </span>
);

const List = ({ children, empty }: { children: ReactNode[]; empty: string }) =>
  children.length ? (
    <div className="divide-y divide-base-300 overflow-hidden rounded-box border border-base-300 bg-base-100">{children}</div>
  ) : (
    <p className="text-sm text-base-content/50">{empty}</p>
  );

export default function ComptesView() {
  const { user, ready } = useAuth();
  const allowed = can(user, "accounts");
  const [team, setTeam] = useState<Team | null>(null);
  const [roles, setRoles] = useState<EditorialRole[]>([]);
  const [learners, setLearners] = useState<Learners | null>(null);
  const [tab, setTab] = useState<Tab>("team");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<PanelAccount | null>(null);
  const [invite, setInvite] = useState<InviteDraft | "new" | null>(null);
  const [error, setError] = useState("");

  const loadTeam = useCallback(async () => {
    const [accounts, available] = await Promise.all([fetchContributors(), fetchRoles()]);
    setTeam({ users: accounts.users, invitations: accounts.invitations, learners: accounts.learners ?? 0 });
    setRoles(available);
    return accounts.users;
  }, []);

  const loadLearners = useCallback(async (query: string, page = 1) => {
    const res = await fetchLearners(query, page);
    setLearners((prev) => ({
      ...res,
      page,
      items: page > 1 && prev ? [...prev.items, ...res.learners] : res.learners,
    }));
    return res.learners;
  }, []);

  useEffect(() => {
    if (allowed) loadTeam().catch((e) => setError(e.message));
  }, [allowed, loadTeam]);

  useEffect(() => {
    if (!allowed || tab !== "learners") return;
    const t = setTimeout(() => loadLearners(q).catch((e) => setError(e.message)), 250);
    return () => clearTimeout(t);
  }, [allowed, tab, q, loadLearners]);

  // Après un enregistrement : recharger, puis garder la fiche ouverte à jour (un
  // lecteur promu passe dans l'équipe, un membre sans rôle redevient lecteur).
  const refresh = async () => {
    const [users, readers] = await Promise.all([loadTeam(), loadLearners(tab === "learners" ? q : "")]);
    const next = [...users, ...readers].find((a) => a.id === open?.id);
    setOpen(next ? asPanel(next) : null);
  };

  if (!ready) return null;
  if (!allowed) return <p className="py-12 text-base-content/70">Réservé à la gestion des comptes.</p>;

  const users = team?.users.filter((u) => matches(q, u.displayName, u.email, u.title)) ?? [];
  const invitations = team?.invitations.filter((i) => matches(q, i.displayName, i.email)) ?? [];
  const tabs: [Tab, string, number | null][] = [
    ["team", "Équipe", team?.users.length ?? null],
    ["learners", "Lecteurs", team?.learners ?? null],
    ["invitations", "Invitations", team?.invitations.length ?? null],
    ["roles", "Rôles", roles.length || null],
  ];

  return (
    <div className="space-y-6 pb-12 pt-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Comptes</h1>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setInvite("new")}>
          Inviter
        </button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-base-200 p-1" aria-label="Sections">
          {tabs.map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${tab === key ? "bg-base-100 shadow-sm" : "text-base-content/70 hover:text-base-content"}`}
            >
              {label}
              {count != null && <span className="ml-1.5 tabular-nums text-base-content/50">{count}</span>}
            </button>
          ))}
        </nav>
        {tab !== "roles" && (
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher"
            aria-label="Rechercher un compte"
            className="input input-bordered input-sm w-full sm:w-56"
          />
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      {!team && !error && <p className="text-sm text-base-content/50">Chargement…</p>}

      {team && tab === "team" && (
        <List empty="Aucun compte.">
          {users.map((u) => {
            const names = roleNamesOf(u.roleIds, roles);
            return (
              <Row
                key={u.id}
                name={u.id === user?.id ? `${u.displayName} (vous)` : u.displayName}
                sub={u.email}
                onClick={() => setOpen(asPanel(u))}
                badges={
                  <>
                    {u.isRoot && <Badge tone="primary">Admin racine</Badge>}
                    {roles
                      .filter((r) => u.roleIds?.includes(r.id))
                      .map((r) => (
                        <RolePill key={r.id} role={r} />
                      ))}
                    {!u.isRoot && !names.length && <Badge>Droits à la carte</Badge>}
                    {!u.active && <Badge tone="error">Désactivé</Badge>}
                  </>
                }
                meta={relative(u.lastSeenAt) ?? "jamais connecté"}
              />
            );
          })}
        </List>
      )}

      {tab === "learners" && learners && (
        <div className="space-y-3">
          <List empty={q ? "Aucun lecteur ne correspond." : "Aucun lecteur inscrit."}>
            {learners.items.map((l) => (
              <Row
                key={l.id}
                name={l.displayName}
                sub={l.email}
                onClick={() => setOpen(asPanel(l))}
                badges={
                  <>
                    {l.newsletter && <Badge>Nouveautés</Badge>}
                    {!l.active && <Badge tone="error">Désactivé</Badge>}
                  </>
                }
                meta={relative(l.lastSeenAt) ?? day(l.createdAt)}
              />
            ))}
          </List>
          {learners.items.length < learners.total && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => loadLearners(q, learners.page + 1).catch((e) => setError(e.message))}>
              Afficher plus ({learners.total - learners.items.length})
            </button>
          )}
        </div>
      )}

      {team && tab === "invitations" && (
        <List empty="Aucune invitation en attente.">
          {invitations.map((i) => {
            const expired = !!i.expiresAt && new Date(i.expiresAt) < new Date();
            const draft = { email: i.email, displayName: i.displayName, title: i.title, roleIds: i.roleIds ?? [] };
            return (
              <div key={i.id} className="flex flex-wrap items-center gap-3 pr-4">
                <div className="min-w-0 flex-1">
                  <Row
                    name={i.displayName}
                    sub={i.email}
                    badges={
                      <>
                        {roleNamesOf(i.roleIds, roles).map((n) => (
                          <Badge key={n}>{n}</Badge>
                        ))}
                        {expired && <Badge tone="error">Expirée</Badge>}
                      </>
                    }
                  />
                </div>
                <div className="flex gap-1 pb-3 pl-4 sm:p-0">
                  <button type="button" className="btn btn-ghost btn-xs" onClick={() => setInvite(draft)}>
                    Renvoyer
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs text-error"
                    onClick={() => cancelInvitation(i.id).then(loadTeam).catch((e) => setError(e.message))}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            );
          })}
        </List>
      )}

      {team && tab === "roles" && (
        <RolesView
          roles={roles}
          members={(id) => team.users.filter((u) => u.roleIds?.includes(id)).length}
          onSaved={async () => void (await loadTeam())}
        />
      )}

      {open && <AccountPanel key={open.id} account={open} roles={roles} self={open.id === user?.id} onClose={() => setOpen(null)} onSaved={refresh} />}
      {invite && (
        <InviteDialog
          roles={roles}
          initial={invite === "new" ? undefined : invite}
          onClose={() => setInvite(null)}
          onSent={async () => {
            await loadTeam();
            setTab("invitations");
          }}
        />
      )}
    </div>
  );
}
