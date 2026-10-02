import type { Claim } from "@/lib/types";

export function getApprovalRatio(upvotes: number, downvotes: number): number {
  const total = upvotes + downvotes;
  if (total === 0) return 100; // 100% par défaut si aucun vote
  return Math.round((upvotes / total) * 100);
}

export function partitionClaims(claims: Claim[]) {
  const active: Claim[] = [];
  const dismissed: Claim[] = [];

  for (const claim of claims) {
    const up = claim.upvotes ?? 0;
    const down = claim.downvotes ?? 0;
    const total = up + down;
    const ratio = getApprovalRatio(up, down);

    // Écarter uniquement si au moins 5 votes ET 70% ou plus de votes "contre" (ratio <= 30%)
    if (total >= 5 && ratio <= 30) {
      dismissed.push({ ...claim, status: "dismissed" });
    } else {
      active.push({ ...claim, status: "active" });
    }
  }

  return { active, dismissed };
}
