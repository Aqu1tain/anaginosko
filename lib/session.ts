import "server-only";
import { cookies } from "next/headers";
import { requireUser, type EditorAuth } from "./auth";

// Compte de la requête, d'après le cookie de session posé par le client.
export async function sessionUser(): Promise<EditorAuth> {
  const token = (await cookies()).get("anaginosko_session")?.value;
  return token ? requireUser(`Bearer ${decodeURIComponent(token)}`) : { ok: false };
}

// Équipe éditoriale ou des cours : seule à voir les aperçus non publiés.
export async function canPreview(): Promise<boolean> {
  const s = await sessionUser();
  return s.ok && (!!s.isRoot || !!s.permissions?.some((p) => ["courses", "articles", "review", "publish"].includes(p)));
}
