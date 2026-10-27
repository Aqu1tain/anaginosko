"use client";

import { useEffect, useRef, useState } from "react";
import type { EditorialRole } from "@/src/lib/api";
import { PERMISSION_GROUPS, PERMISSION_HINT, PERMISSION_LABEL, roleColor, type Permission } from "@/src/data/permissions";

export const RoleDot = ({ id }: { id: number }) => (
  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: roleColor(id) }} aria-hidden="true" />
);

export function RolePill({ role, onRemove }: { role: EditorialRole; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-base-200 py-1 pl-2 pr-2 text-xs font-medium">
      <RoleDot id={role.id} />
      {role.name}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Retirer le rôle ${role.name}`} className="-mr-0.5 ml-0.5 text-base-content/70 hover:text-base-content">
          ×
        </button>
      )}
    </span>
  );
}

// Pastilles des rôles d'un compte, avec « + » pour en ajouter (menu des autres rôles).
export function RoleChips({
  roles,
  value,
  onChange,
  disabled,
}: {
  roles: EditorialRole[];
  value: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const others = roles.filter((r) => !value.includes(r.id));

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={box} className="relative flex flex-wrap items-center gap-1.5">
      {roles
        .filter((r) => value.includes(r.id))
        .map((r) => (
          <RolePill key={r.id} role={r} onRemove={disabled ? undefined : () => onChange(value.filter((id) => id !== r.id))} />
        ))}
      {!disabled && others.length > 0 && (
        <button
          type="button"
          aria-label="Ajouter un rôle"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="grid h-6 w-6 place-items-center rounded-md bg-base-200 text-base-content/80 hover:bg-base-300 hover:text-base-content"
        >
          +
        </button>
      )}
      {open && (
        <ul className="absolute left-0 top-full z-10 mt-1 w-56 rounded-box border border-base-300 bg-base-100 p-1 shadow-lg">
          {others.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  onChange([...value, r.id]);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-base-200"
              >
                <RoleDot id={r.id} />
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Droits par catégorie : titre, description, interrupteur à droite. `via` nomme
// le rôle qui accorde déjà le droit (interrupteur alors verrouillé).
export function PermissionList({
  isOn,
  via = () => [],
  onToggle,
  disabled,
}: {
  isOn: (p: Permission) => boolean;
  via?: (p: Permission) => string[];
  onToggle: (p: Permission, on: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-6">
      {PERMISSION_GROUPS.map((g) => (
        <section key={g.title}>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-base-content/70">{g.title}</h4>
          <ul className="divide-y divide-base-300">
            {g.permissions.map((p) => {
              const from = via(p);
              const locked = disabled || from.length > 0;
              return (
                <li key={p}>
                  <label className={`flex items-start gap-4 py-3 ${locked ? "" : "cursor-pointer"}`}>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{PERMISSION_LABEL[p]}</span>
                      <span className="block text-xs text-base-content/70">
                        {PERMISSION_HINT[p]}
                        {from.length > 0 && <span className="text-base-content/80"> · via {from.join(", ")}</span>}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      className="toggle toggle-sm toggle-success mt-0.5"
                      checked={isOn(p) || from.length > 0}
                      disabled={locked}
                      onChange={(e) => onToggle(p, e.target.checked)}
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
