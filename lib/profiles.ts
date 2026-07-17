import "server-only";
import fs from "node:fs";
import path from "node:path";
import { slugify, saveImageUpload } from "./articles";

// Profils publics, un par compte (tout rôle). Métadonnées éditoriales stockées côté
// Next (l'API ne gère que l'authentification) : photo, bio, liens. Clé = userId de /me.

export type ProfileLink = { label: string; url: string };
export type Profile = {
  userId: number;
  slug: string;
  displayName: string;
  bio: string;
  photo: string | null;
  links: ProfileLink[];
  updatedAt: string;
};

const MAX_BIO = 2000;
const MAX_LINKS = 8;
const MAX_LABEL = 60;

const ARTICLES_DIR = process.env.ARTICLES_DIR || path.join(process.cwd(), ".articles");
const PROFILES_SUB = path.join(ARTICLES_DIR, "profiles");

const profilePath = (userId: number) => path.join(PROFILES_SUB, `${userId}.json`);
const now = () => new Date().toISOString();

function readAll(): Profile[] {
  try {
    return fs
      .readdirSync(PROFILES_SUB)
      .filter((f) => f.endsWith(".json") && !f.endsWith(".tmp"))
      .map((f) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(PROFILES_SUB, f), "utf8")) as Profile;
        } catch {
          return null;
        }
      })
      .filter((p): p is Profile => p !== null);
  } catch {
    return [];
  }
}

function readProfile(userId: number): Profile | null {
  try {
    return JSON.parse(fs.readFileSync(profilePath(userId), "utf8")) as Profile;
  } catch {
    return null;
  }
}

function writeProfile(p: Profile) {
  fs.mkdirSync(PROFILES_SUB, { recursive: true });
  const target = profilePath(p.userId);
  const tmp = target + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(p, null, 2));
  fs.renameSync(tmp, target);
}

function uniqueSlug(base: string, userId: number): string {
  const taken = new Set(readAll().filter((p) => p.userId !== userId).map((p) => p.slug));
  const root = slugify(base);
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}

// Profil du compte courant : le fichier existant, ou un profil par défaut non encore
// persisté (dérivé de /me).
export function getMyProfile(auth: { id?: number; name?: string }): Profile {
  if (auth.id == null) throw new Error("Non authentifié.");
  const existing = readProfile(auth.id);
  if (existing) return existing;
  return {
    userId: auth.id,
    slug: uniqueSlug(auth.name || `contributeur-${auth.id}`, auth.id),
    displayName: auth.name || "Contributeur",
    bio: "",
    photo: null,
    links: [],
    updatedAt: now(),
  };
}

export const getProfileBySlug = (slug: string): Profile | null => readAll().find((p) => p.slug === slug) ?? null;
export const getProfileByUserId = (userId: number): Profile | null => readProfile(userId);
export const listProfiles = (): Profile[] => readAll();

export type ProfilePatch = { slug?: string; bio?: string; photo?: string | null; links?: ProfileLink[] };

export function saveProfile(
  auth: { id?: number; name?: string },
  patch: ProfilePatch,
): { ok: true; profile: Profile } | { ok: false; status: number; error: string } {
  if (auth.id == null) return { ok: false, status: 401, error: "Non authentifié." };
  const current = getMyProfile(auth);
  const next: Profile = { ...current, displayName: auth.name || current.displayName, updatedAt: now() };

  if (patch.slug !== undefined) {
    const clean = slugify(patch.slug);
    if (!clean) return { ok: false, status: 400, error: "Adresse de profil invalide." };
    next.slug = uniqueSlug(clean, auth.id);
  }
  if (patch.bio !== undefined) {
    if (patch.bio.length > MAX_BIO) return { ok: false, status: 400, error: "Bio trop longue." };
    next.bio = patch.bio;
  }
  if (patch.photo !== undefined) {
    if (patch.photo !== null && !/^\/articles\/uploads\/[a-z0-9-]+\/[a-z0-9]+\.(png|jpe?g|webp)$/i.test(patch.photo))
      return { ok: false, status: 400, error: "Photo invalide." };
    next.photo = patch.photo;
  }
  if (patch.links !== undefined) {
    if (!Array.isArray(patch.links) || patch.links.length > MAX_LINKS)
      return { ok: false, status: 400, error: `Maximum ${MAX_LINKS} liens.` };
    const links: ProfileLink[] = [];
    for (const l of patch.links) {
      const label = String(l?.label ?? "").trim().slice(0, MAX_LABEL);
      const url = String(l?.url ?? "").trim();
      if (!label && !url) continue;
      if (!/^https?:\/\//i.test(url)) return { ok: false, status: 400, error: "Chaque lien doit commencer par http(s)://." };
      links.push({ label: label || url, url });
    }
    next.links = links;
  }
  writeProfile(next);
  return { ok: true, profile: next };
}

export function savePhoto(
  auth: { id?: number; name?: string },
  buf: Buffer,
): { ok: true; profile: Profile } | { ok: false; status: number; error: string } {
  if (auth.id == null) return { ok: false, status: 401, error: "Non authentifié." };
  const up = saveImageUpload(`profile-${auth.id}`, buf);
  if (!up.ok) return up;
  return saveProfile(auth, { photo: up.url });
}
