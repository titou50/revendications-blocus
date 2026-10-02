"use client";

import { ThumbsDown, CircleAlert, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Claim, VoteType } from "@/lib/types";
import { claimScore } from "@/lib/types";

const ACTIONS: { type: VoteType; label: string; icon: typeof ThumbsDown }[] = [
  { type: "against", label: "Contre", icon: ThumbsDown },
  { type: "low_priority", label: "Pas important", icon: CircleAlert },
  { type: "off_topic", label: "Hors sujet", icon: Ban },
];

export function ClaimList({
  title,
  claims,
  empty,
  onVote,
}: {
  title: string;
  claims: Claim[];
  empty: string;
  onVote: (claimId: string, voteType: VoteType) => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-[family-name:var(--font-instrument)] text-2xl tracking-tight">
        {title}
      </h2>
      {claims.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {claims.map((claim) => (
            <li
              key={claim.id}
              className="rounded-lg border bg-card/80 px-3 py-3 shadow-sm sm:px-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <p className="text-[1.05rem] leading-snug">
                  <span className="mr-2 text-muted-foreground">•</span>
                  {claim.formatted_title}
                </p>
                <div className="flex flex-wrap gap-1.5 sm:justify-end">
                  {ACTIONS.map(({ type, label, icon: Icon }) => (
                    <Button
                      key={type}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onVote(claim.id, type)}
                    >
                      <Icon />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Score communauté {claimScore(claim)} / 15 pour rester dans le document
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
