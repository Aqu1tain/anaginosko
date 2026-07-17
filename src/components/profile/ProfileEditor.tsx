"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/src/hooks/useAuth";
import { fetchMyProfile, saveMyProfile, uploadProfilePhoto } from "@/src/lib/profileApi";
import { compressImage } from "@/src/components/articles/compressImage";
import type { Profile, ProfileLink } from "@/lib/profiles";

export default function ProfileEditor() {
  const { user, ready } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchMyProfile().then(setProfile).catch((e) => setError(e.message));
  }, [user]);

  if (!ready) return null;
  if (!user)
    return (
      <div className="py-20 text-center text-base-content/70">
        <p>Connexion requise pour éditer votre profil.</p>
        <a href="/login" className="link link-primary mt-3 inline-block">Se connecter</a>
      </div>
    );
  if (error) return <div className="alert alert-warning mt-6 text-sm">{error}</div>;
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
      const updated = await saveMyProfile({ slug: profile.slug, bio: profile.bio, links: profile.links });
      setProfile(updated);
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
    <div className="mx-auto max-w-2xl pb-16 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mon profil</h1>
        <Link href={`/contributeurs/${profile.slug}`} className="btn btn-ghost btn-sm">Voir ma page</Link>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <div className="avatar">
          <div className="h-20 w-20 rounded-full bg-base-300">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {profile.photo && <img src={profile.photo} alt="" className="h-full w-full rounded-full object-cover" />}
          </div>
        </div>
        <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? "…" : "Changer la photo"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) onPhoto(e.target.files[0]);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Nom affiché</label>
          <input value={profile.displayName} disabled className="input input-bordered mt-1 w-full opacity-70" />
          <p className="mt-1 text-xs text-base-content/50">Géré par votre compte.</p>
        </div>

        <div>
          <label className="text-sm font-medium">Adresse de la page</label>
          <label className="input input-bordered mt-1 flex w-full items-center gap-0.5 pl-3">
            <span className="whitespace-nowrap text-sm text-base-content/40">/contributeurs/</span>
            <input
              value={profile.slug}
              onChange={(e) => set({ slug: e.target.value })}
              className="grow bg-transparent focus:outline-none"
            />
          </label>
        </div>

        <div>
          <label className="text-sm font-medium">Bio</label>
          <textarea
            value={profile.bio}
            onChange={(e) => set({ bio: e.target.value })}
            rows={5}
            placeholder="Quelques mots sur vous, votre travail…"
            className="textarea textarea-bordered mt-1 w-full"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Liens</label>
          <div className="mt-1 space-y-2">
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
                <button className="btn btn-ghost btn-sm" onClick={() => set({ links: profile.links.filter((_, j) => j !== i) })}>
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
        </div>
      </div>

      {error && <div className="alert alert-error mt-4 text-sm">{error}</div>}
      <div className="mt-6 flex items-center gap-3">
        <button className="btn btn-primary" disabled={busy} onClick={save}>Enregistrer</button>
        {saved && <span className="text-sm text-success">Profil enregistré.</span>}
      </div>
    </div>
  );
}
