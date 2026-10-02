import type { Claim, VoteType } from "@/lib/types";
import { getApprovalRatio } from "@/lib/score";

interface ClaimListProps {
  title: string;
  claims: Claim[];
  empty: string;
  onVote: (claimId: string, type: VoteType) => void;
}

export function ClaimList({ title, claims, empty, onVote }: ClaimListProps) {
  if (claims.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground italic">{empty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">{title}</h3>
      <div className="space-y-3">
        {claims.map((claim) => {
          const up = claim.upvotes ?? 0;
          const down = claim.downvotes ?? 0;
          const total = up + down;
          const ratio = getApprovalRatio(up, down);

          return (
            <div
              key={claim.id}
              className="p-4 rounded-xl border bg-card flex items-center justify-between gap-4"
            >
              <div className="space-y-1 flex-1">
                <p className="font-semibold text-base">{claim.formatted_title}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{ratio}% d'accord ({total} vote{total > 1 ? "s" : ""})</span>
                  {/* Indicateur visuel de soutien */}
                  <div className="w-24 h-1.5 bg-red-500/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Boutons Pour / Contre */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onVote(claim.id, "up")}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 font-medium text-xs flex items-center gap-1 transition"
                >
                  👍 {up}
                </button>
                <button
                  onClick={() => onVote(claim.id, "down")}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 font-medium text-xs flex items-center gap-1 transition"
                >
                  👎 {down}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
