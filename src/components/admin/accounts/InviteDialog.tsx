"use client";

import { useEffect, useRef, useState } from "react";
import { inviteContributor, type EditorialRole } from "@/src/lib/api";

export type InviteDraft = { email: string; displayName: string; title: string; roleIds: number[] };

export default function InviteDialog({
  roles,
  initial,
  onClose,
  onSent,
}: {
  roles: EditorialRole[];
  initial?: InviteDraft;
  onClose: () => void;
  onSent: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<InviteDraft>(initial ?? { email: "", displayName: "", title: "", roleIds: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const set = (patch: Partial<InviteDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await inviteContributor({ ...draft, title: draft.title || "Contributeur", permissions: [] });
      await onSent();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  };

  return (
    <dialog ref={dialog} className="modal" onClose={onClose}>
      <form onSubmit={submit} className="modal-box max-w-md space-y-4">
        <h2 className="text-lg font-semibold">{initial ? "Renvoyer l’invitation" : "Inviter dans l’équipe"}</h2>
        <label className="block text-sm">
          E-mail
          <input type="email" required className="input input-bordered mt-1 w-full" value={draft.email} onChange={(e) => set({ email: e.target.value })} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Nom
            <input required maxLength={80} className="input input-bordered mt-1 w-full" value={draft.displayName} onChange={(e) => set({ displayName: e.target.value })} />
          </label>
          <label className="block text-sm">
            Titre public
            <input maxLength={80} placeholder="Auteur" className="input input-bordered mt-1 w-full" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
          </label>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm">Rôles</legend>
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => {
              const on = draft.roleIds.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set({ roleIds: on ? draft.roleIds.filter((id) => id !== r.id) : [...draft.roleIds, r.id] })}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${on ? "border-primary bg-primary text-primary-content" : "border-base-300 hover:border-base-content/30"}`}
                >
                  {r.name}
                </button>
              );
            })}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
        <div className="modal-action">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary btn-sm" disabled={busy || !draft.roleIds.length}>
            {busy ? "Envoi…" : "Envoyer"}
          </button>
        </div>
      </form>
      <form method="dialog" className="modal-backdrop">
        <button aria-label="Fermer">Fermer</button>
      </form>
    </dialog>
  );
}
