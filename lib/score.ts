import { claimScore, DISMISSAL_SCORE, type Claim } from "@/lib/types";

export function sortClaims(claims: Claim[]): Claim[] {
  return [...claims].sort((a, b) => {
    const scoreDiff = claimScore(a) - claimScore(b);
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

export function partitionClaims(claims: Claim[]) {
  const active: Claim[] = [];
  const dismissed: Claim[] = [];
  for (const claim of sortClaims(claims)) {
    if (claimScore(claim) > DISMISSAL_SCORE || claim.status === "flagged") {
      dismissed.push(claim);
    } else {
      active.push(claim);
    }
  }
  return { active, dismissed };
}
