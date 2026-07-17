import { getToken } from "./api";
import type { Profile, ProfilePatch } from "@/lib/profiles";

const BASE = "/mon-profil/api";

async function profileFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      message = (await res.json()).error ?? message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json();
}

export const fetchMyProfile = () => profileFetch<{ profile: Profile }>("").then((d) => d.profile);

export const saveMyProfile = (patch: ProfilePatch) =>
  profileFetch<{ profile: Profile }>("", { method: "PUT", body: JSON.stringify(patch) }).then((d) => d.profile);

export async function uploadProfilePhoto(file: Blob): Promise<Profile> {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/photo`, {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form,
  });
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      message = (await res.json()).error ?? message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()).profile as Profile;
}
