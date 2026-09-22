import "server-only";
export type Reviewer = { id: number; displayName: string; title: string };
export async function fetchReviewers(
  authorization: string | null,
): Promise<Reviewer[]> {
  const base = process.env.ARB_API_URL || "http://127.0.0.1:3333/api";
  const r = await fetch(`${base}/editorial/reviewers`, {
    headers: { Authorization: authorization ?? "" },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok)
    throw new Error(
      "La liste des relecteurs est indisponible. La nouvelle API éditoriale doit être installée.",
    );
  return (await r.json()).reviewers;
}
export async function notifyReviewer(
  authorization: string | null,
  input: {
    articleId: string;
    requestId: string;
    reviewerId: number;
    title: string;
    note: string;
  },
) {
  const base = process.env.ARB_API_URL || "http://127.0.0.1:3333/api";
  const r = await fetch(`${base}/editorial/review-requests`, {
    method: "POST",
    headers: {
      Authorization: authorization ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok)
    throw new Error(
      "La demande est enregistrée mais l'e-mail n'a pas été envoyé. Réessayez depuis la fiche.",
    );
}
