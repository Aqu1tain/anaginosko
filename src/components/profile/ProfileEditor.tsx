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
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      {desc && <p className="mt-1 text-sm text-base-content/70">{desc}</p>}
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
  const { user, ready, refreshPhoto } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchMyProfile().then(setProfile).catch((e) => setError(e.message));
    fetchMe()
      .then((me) => setEmail(me.email ?? ""))
      .catch(() => {});
  }, [user]);

  if (!ready) return null;
  if (!user)
    return (
      <div className="py-16 text-center">
        <p className="text-base-content/70">Connectez-vous pour modifier votre profil.</p>
        <a href="/login" className="btn btn-primary btn-sm mt-4">Se connecter</a>
      </div>
    );
  if (error && !profile) return <p className="mt-6 text-sm text-error">{error}</p>;
  if (!profile) return <div className="py-12 text-center text-sm text-base-content/50">Chargement…</div>;

  const set = (patch: Partial<Profile>) => setProfile((p) => (p ? { ...p, ...patch } : p));

  const onPhoto = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      setProfile(await uploadProfilePhoto(await compressImage(file)));
      refreshPhoto();
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
      // d'affichage : règle unique, un seul nom partout.
      await updateMe({ displayName: updated.displayName });
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
    <div className="mx-auto max-w-2xl pb-12 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Mon profil</h1>
        <Link href={`/contributeurs/${profile.slug}`} className="btn btn-outline btn-sm">
          Voir ma page
        </Link>
      </div>

      <div className="mt-8 space-y-12">
        <Section title="Identité">
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
            <Field label="Nom d'affichage">
              <input
                value={profile.displayName}
                onChange={(e) => set({ displayName: e.target.value })}
                className="input input-bordered w-full"
                placeholder="ex. Biblion, Βιβλίον…"
              />
            </Field>
            <Field label="Nom complet" hint="Facultatif, affiché publiquement.">
              <input
                value={profile.fullName}
                onChange={(e) => set({ fullName: e.target.value })}
                className="input input-bordered w-full"
                placeholder="ex. Henri Martin"
              />
            </Field>
          </div>
        </Section>

        <Section title="Compte">
          <Field label="Adresse e-mail">
            <p className="rounded-lg bg-base-200/70 px-3 py-2 text-sm">{email || "…"}</p>
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

      {error && <p className="mt-6 text-sm text-error">{error}</p>}
      <div className="sticky bottom-4 mt-8 flex items-center gap-3 rounded-box border border-base-300 bg-base-100/95 p-3 shadow-lg backdrop-blur">
        <button className="btn btn-primary btn-sm" disabled={busy} onClick={save}>
          Enregistrer
        </button>
        {saved && <span className="text-sm text-success">Profil enregistré.</span>}
      </div>
    </div>
  );
}
