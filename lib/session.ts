import "server-only";
import { cookies } from "next/headers";
import { requireUser, type EditorAuth } from "./auth";

// Compte de la requête, d'après le cookie de session posé par le client.
export async function sessionUser(): Promise<EditorAuth> {
  const token = (await cookies()).get("anaginosko_session")?.value;
  return token ? requireUser(`Bearer ${decodeURIComponent(token)}`) : { ok: false };
}
