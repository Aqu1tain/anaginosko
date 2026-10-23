"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { UIMessage } from "ai";
import { useAuth } from "@/src/hooks/useAuth";
import { can } from "@/src/lib/api";
import { deleteConversation, fetchConversation, fetchConversations, renameConversation, type ConversationInfo } from "@/src/lib/aiApi";
import { useAiSettings } from "@/src/components/workshop/assistant/useAiSettings";
import Conversation from "./Conversation";

const DAY = 86_400_000;

function groups(list: ConversationInfo[]) {
  const start = new Date().setHours(0, 0, 0, 0);
  const label = (iso: string) => {
    const t = new Date(iso).getTime();
    if (t >= start) return "Aujourd’hui";
    if (t >= start - DAY) return "Hier";
    if (t >= start - 7 * DAY) return "7 derniers jours";
    if (t >= start - 30 * DAY) return "30 derniers jours";
    return "Plus ancien";
  };
  const out: { label: string; items: ConversationInfo[] }[] = [];
  for (const c of list) {
    const l = label(c.updatedAt);
    (out.at(-1)?.label === l ? out.at(-1)! : out[out.push({ label: l, items: [] }) - 1]).items.push(c);
  }
  return out;
}

function History({
  list,
  active,
  onOpen,
  onNew,
  onChanged,
}: {
  list: ConversationInfo[] | null;
  active: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  onChanged: () => void;
}) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => (list ?? []).filter((c) => !q || c.title.toLowerCase().includes(q.toLowerCase())), [list, q]);

  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={onNew} className="btn btn-outline btn-sm justify-start gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Nouvelle conversation
      </button>
      {(list?.length ?? 0) > 6 && (
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher" className="input input-bordered input-sm w-full" />
      )}
      {list === null ? (
        <p className="px-2 text-sm text-base-content/50">Chargement…</p>
      ) : !list.length ? (
        <p className="px-2 text-sm text-base-content/50">Aucune conversation.</p>
      ) : (
        <nav aria-label="Conversations" className="space-y-4">
          {groups(shown).map((g) => (
            <div key={g.label}>
              <p className="px-2 pb-1 text-xs font-medium text-base-content/50">{g.label}</p>
              <ul>
                {g.items.map((c) => (
                  <li key={c.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => onOpen(c.id)}
                      aria-current={c.id === active ? "true" : undefined}
                      className={`block w-full truncate rounded-lg py-1.5 pr-14 pl-2 text-left text-sm ${c.id === active ? "bg-base-200 font-medium" : "text-base-content/70 hover:bg-base-200/60"}`}
                    >
                      {c.title}
                    </button>
                    <span className="absolute top-1/2 right-1 hidden -translate-y-1/2 gap-0.5 group-hover:flex group-focus-within:flex">
                      <button
                        type="button"
                        aria-label="Renommer"
                        className="rounded p-1 text-base-content/50 hover:bg-base-300 hover:text-base-content"
                        onClick={() => {
                          const title = prompt("Nouveau titre", c.title)?.trim();
                          if (title) renameConversation(c.id, title).then(onChanged);
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M4 20h4L19 9l-4-4L4 16z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        aria-label="Supprimer"
                        className="rounded p-1 text-base-content/50 hover:bg-base-300 hover:text-error"
                        onClick={() => {
                          if (confirm(`Supprimer « ${c.title} » ?`)) deleteConversation(c.id).then(onChanged);
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />
                        </svg>
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      )}
    </div>
  );
}

const freshId = () => crypto.randomUUID();

// IAnaginosko : assistant du site (bêta, clé personnelle), historique des conversations.
export default function IAnaginoskoView() {
  const { user, ready } = useAuth();
  const pathname = usePathname();
  const params = useSearchParams();
  const { settings, choose } = useAiSettings();
  const [list, setList] = useState<ConversationInfo[] | null>(null);
  const [current, setCurrent] = useState<{ id: string; messages: UIMessage[] } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const wanted = params.get("c");
  const allowed = can(user, "ai");

  const loadList = useCallback(
    () =>
      fetchConversations()
        .then(setList)
        .catch(() => setList([])),
    [],
  );

  useEffect(() => {
    if (allowed) loadList();
  }, [allowed, loadList]);

  useEffect(() => {
    if (!allowed) return;
    if (!wanted) {
      setCurrent((c) => (c && !list?.some((x) => x.id === c.id) && !c.messages.length ? c : { id: freshId(), messages: [] }));
      return;
    }
    if (current?.id === wanted) return;
    fetchConversation(wanted)
      .then((c) => setCurrent({ id: c.id, messages: c.messages as UIMessage[] }))
      .catch(() => window.history.replaceState(null, "", pathname));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, allowed]);

  if (!ready) return null;
  if (!allowed) return <p className="py-20 text-center text-base-content/70">Réservé aux comptes de la bêta.</p>;

  const keys = settings?.keys ?? [];
  const open = (id: string) => {
    setHistoryOpen(false);
    window.history.pushState(null, "", `${pathname}?c=${id}`);
  };
  const startNew = () => {
    setHistoryOpen(false);
    setCurrent({ id: freshId(), messages: [] });
    window.history.pushState(null, "", pathname);
  };

  return (
    <div className="grid gap-6 pt-4 wide:grid-cols-[15rem_minmax(0,1fr)] wide:gap-10">
      <aside className={`${historyOpen ? "block" : "hidden"} wide:block`}>
        <div className="wide:sticky wide:top-20 wide:max-h-[calc(100dvh-6rem)] wide:overflow-y-auto">
          <History list={list} active={current?.id ?? null} onOpen={open} onNew={startNew} onChanged={loadList} />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex items-center gap-3 border-b border-base-300 pb-3">
          <button type="button" className="btn btn-ghost btn-sm -ml-2 px-2 wide:hidden" onClick={() => setHistoryOpen(!historyOpen)} aria-expanded={historyOpen} aria-label="Conversations">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">IAnaginosko</h1>
          <span className="badge badge-sm badge-outline">Bêta</span>
          <Link href="/mon-compte#assistant" className="btn btn-ghost btn-sm ml-auto gap-1.5" aria-label="Paramètres de l’assistant">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
              <circle cx="16" cy="7" r="2" />
              <circle cx="10" cy="17" r="2" />
            </svg>
            <span className="hidden sm:inline">Clés et modèles</span>
          </Link>
        </header>

        <div className="mx-auto max-w-3xl">
          {settings && !keys.length ? (
            <div className="py-16 text-center">
              <p className="text-base-content/70">Aucune clé d’API.</p>
              <Link href="/mon-compte#assistant" className="btn btn-primary btn-sm mt-4">
                Ajouter une clé
              </Link>
            </div>
          ) : (
            current &&
            settings && (
              <Conversation
                key={current.id}
                id={current.id}
                initial={current.messages}
                keys={keys}
                pick={settings.draft}
                onPick={(p) => choose("draft", p)}
                onStarted={(id) => window.history.replaceState(null, "", `${pathname}?c=${id}`)}
                onFinished={loadList}
              />
            )
          )}
        </div>
      </div>

    </div>
  );
}
