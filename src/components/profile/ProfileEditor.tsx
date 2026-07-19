"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/src/hooks/useAuth";
import { fetchMe, updateMe } from "@/src/lib/api";
import { fetchMyProfile, saveMyProfile, uploadProfilePhoto } from "@/src/lib/profileApi";
import { compressImage } from "@/src/components/articles/compressImage";
import Avatar from "./Avatar";
import type { Profile, ProfileLink } from "@/lib/profiles";

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      {desc && <p className="mt-0.5 text-xs text-base-content/55">{desc}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-base-content/50">{hint}</p>}
    </div>
  );
}

export default function ProfileEditor() {
  const { user, ready } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [emailSupported, setEmailSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchMyProfile().then(setProfile).catch((e) => setError(e.message));
    fetchMe()
      .then((me) => {
        if (me.email) setEmail(me.email);
        else setEmailSupported(false);
      })
      .catch(() => setEmailSupported(false));
  }, [user]);

  if (!ready) return null;
  if (!user)
    return (
      <div className="py-20 text-center text-base-content/70">
        <p>Connexion requise pour éditer votre profil.</p>
        <a href="/login" className="link link-primary mt-3 inline-block">Se connecter</a>
      </div>
    );
  if (error && !profile) return <div className="alert alert-warning mt-6 text-sm">{error}</div>;
  if (!profile) return <div className="py-20 text-center text-base-content/60">Chargement…</div>;

  const set = (patch: Partial<Profile>) => setProfile((p) => (p ? { ...p, ...patch } : p));

  const onPhoto = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      setProfile(await uploadProfilePhoto(await compressImage(file)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await saveMyProfile({
        displayName: profile.displayName,
        fullName: profile.fullName,
        slug: profile.slug,
        bio: profile.bio,
        links: profile.links,
      });
      setProfile(updated);
      // Aligne le nom de compte (annotations, tableau de bord) sur le nom
      // d'affichage : règle unique, un seul nom partout. Best-effort : une API
      // antérieure ne connaît pas encore PUT /me.
      if (emailSupported) {
        const patch: { displayName: string; email?: string } = { displayName: updated.displayName };
        if (email.trim()) patch.email = email.trim();
        await updateMe(patch).catch((e) => {
          if ((e as Error).message.includes("404")) setEmailSupported(false);
          else throw e;
        });
      }
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const updateLink = (i: number, patch: Partial<ProfileLink>) =>
    set({ links: profile.links.map((l, j) => (j === i ? { ...l, ...patch } : l)) });

  return (
    <div className="mx-auto max-w-2xl pb-16 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mon profil</h1>
          <p className="mt-1 text-sm text-base-content/60">
            Votre identité publique : elle signe vos articles et votre page.
          </p>
        </div>
        <Link href={`/contributeurs/${profile.slug}`} className="btn btn-outline btn-sm">
          Voir ma page publique
        </Link>
      </div>

      <div className="mt-6 space-y-5">
        <Section title="Identité" desc="Le nom d'affichage et la photo apparaissent sur vos articles.">
          <div className="flex items-center gap-4">
            <Avatar name={profile.displayName} photo={profile.photo} size={80} />
            <label className="btn btn-outline btn-sm cursor-pointer">
              {busy ? "…" : "Changer la photo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files?.[0]) onPhoto(e.target.files[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom d'affichage" hint="Signe vos articles et votre page publique.">
              <input
                value={profile.displayName}
                onChange={(e) => set({ displayName: e.target.value })}
                className="input input-bordered w-full"
                placeholder="ex. Noah, Βιβλίον…"
              />
            </Field>
            <Field label="Nom complet" hint="Facultatif, affiché sous le nom d'affichage.">
              <input
                value={profile.fullName}
                onChange={(e) => set({ fullName: e.target.value })}
                className="input input-bordered w-full"
                placeholder="ex. Noah Jaubert"
              />
            </Field>
          </div>
        </Section>

        <Section title="Compte" desc="L'adresse e-mail sert uniquement à la connexion, jamais affichée.">
          <Field label="Adresse e-mail">
            {emailSupported ? (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input input-bordered w-full"
                placeholder="vous@exemple.fr"
              />
            ) : (
              <p className="rounded-lg bg-base-200/70 px-3 py-2 text-sm text-base-content/60">
                La modification de l&apos;e-mail sera disponible après la prochaine mise à jour du serveur.
              </p>
            )}
          </Field>
        </Section>

        <Section title="Page publique">
          <Field label="Adresse de la page">
            <label className="input input-bordered flex w-full items-center gap-0.5 pl-3">
              <span className="whitespace-nowrap text-sm text-base-content/40">/contributeurs/</span>
              <input
                value={profile.slug}
                onChange={(e) => set({ slug: e.target.value })}
                className="grow bg-transparent focus:outline-none"
              />
            </label>
          </Field>
          <Field label="Bio">
            <textarea
              value={profile.bio}
              onChange={(e) => set({ bio: e.target.value })}
              rows={4}
              placeholder="Quelques mots sur vous, votre travail…"
              className="textarea textarea-bordered w-full"
            />
          </Field>
          <Field label="Liens">
            <div className="space-y-2">
              {profile.links.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={l.label}
                    onChange={(e) => updateLink(i, { label: e.target.value })}
                    placeholder="Intitulé"
                    className="input input-bordered input-sm w-1/3"
                  />
                  <input
                    value={l.url}
                    onChange={(e) => updateLink(i, { url: e.target.value })}
                    placeholder="https://…"
                    className="input input-bordered input-sm w-full"
                  />
                  <button
                    className="btn btn-ghost btn-sm"
                    aria-label="Supprimer ce lien"
                    onClick={() => set({ links: profile.links.filter((_, j) => j !== i) })}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {profile.links.length < 8 && (
                <button className="btn btn-ghost btn-sm" onClick={() => set({ links: [...profile.links, { label: "", url: "" }] })}>
                  + Ajouter un lien
                </button>
              )}
            </div>
          </Field>
        </Section>
      </div>

      {error && <div className="alert alert-error mt-4 text-sm">{error}</div>}
      <div className="sticky bottom-4 mt-6 flex items-center gap-3 rounded-xl border border-base-300 bg-base-100/95 p-3 shadow-lg backdrop-blur">
        <button className="btn btn-primary" disabled={busy} onClick={save}>
          Enregistrer le profil
        </button>
        {saved && <span className="text-sm text-success">Profil enregistré.</span>}
      </div>
    </div>
  );
}
