import "server-only";
import { listProfiles } from "./profiles";
import { listPublished } from "./articles";

export function listTeam() {
  const counts = new Map<number, number>();
  for (const a of listPublished()) counts.set(a.author.userId, (counts.get(a.author.userId) ?? 0) + 1);
  return listProfiles()
    .map((p) => ({ ...p, articles: counts.get(p.userId) ?? 0 }))
    .sort((a, b) => b.articles - a.articles || a.userId - b.userId);
}
