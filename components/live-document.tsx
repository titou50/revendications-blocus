"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { AddClaimDialog } from "@/components/add-claim-dialog";
import { ClaimList } from "@/components/claim-list";
import { ExportInstaButton } from "@/components/export-insta-button";
import { ExportEmailButton } from "@/components/export-email-button";
import { Badge } from "@/components/ui/badge";
import { partitionClaims } from "@/lib/score";
import type { Claim, Establishment, VoteType } from "@/lib/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function LiveDocument({
  establishment,
  initialClaims,
}: {
  establishment: Establishment;
  initialClaims: Claim[];
}) {
  const [claims, setClaims] = useState(initialClaims);
  const [participants, setParticipants] = useState(establishment.participant_count);

  // Synchronisation Realtime sécurisée sans doublons
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-claims-${establishment.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "claims",
          filter: `establishment_id=eq.${establishment.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newClaim = payload.new as Claim;
            if (newClaim.status !== "archived") {
              setClaims((prev) => {
                // Ignore si l'élément existe déjà
                if (prev.some((c) => c.id === newClaim.id)) return prev;
                return [newClaim, ...prev];
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedClaim = payload.new as Claim;
            setClaims((prev) =>
              prev
                .map((c) => (c.id === updatedClaim.id ? updatedClaim : c))
                .filter((c) => c.status !== "archived")
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [establishment.id]);

  useEffect(() => {
    setParticipants(establishment.participant_count);
  }, [establishment.participant_count]);

  // Gestion du vote
  async function vote(claimId: string, voteType: VoteType) {
    const res = await fetch("/api/claims/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimId, voteType }),
    });

    const data = await res.json();
    if (!res.ok) return;

    if (data.claim) {
      setClaims((prev) =>
        prev.map((c) => (c.id === data.claim.id ? data.claim : c))
      );
    }
  }

  const local = useMemo(
    () => partitionClaims(claims.filter((c) => c.category === "local")),
    [claims]
  );
  const national = useMemo(
    () => partitionClaims(claims.filter((c) => c.category === "national")),
    [claims]
  );
  const dismissed = [...local.dismissed, ...national.dismissed];

  const currentEstablishment = {
    ...establishment,
    participant_count: participants,
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-36 pt-8">
      <header className="mb-10 border-b border-dashed pb-6">
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">
          Document live
        </p>
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="font-[family-name:var(--font-instrument)] text-4xl leading-tight sm:text-5xl">
            {establishment.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <ExportInstaButton
              establishment={currentEstablishment}
              claims={claims}
            />
            <ExportEmailButton
              establishment={currentEstablishment}
              claims={claims}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <a href="/" className="underline-offset-2 hover:text-foreground hover:underline">
            Changer d’établissement
          </a>
          <span>
            {establishment.city} · {establishment.type}
          </span>
          <Badge variant="secondary">
            {participants} participant{participants > 1 ? "s" : ""}
          </Badge>
        </div>
      </header>

      <div className="mb-8">
        <AddClaimDialog
          establishmentId={establishment.id}
          onCreated={(claim) => {
            setClaims((prev) => {
              if (prev.some((c) => c.id === claim.id)) return prev;
              return [claim, ...prev];
            });
          }}
        />
      </div>

      <div className="space-y-10">
        <ClaimList
          title="Revendications locales"
          claims={local.active}
          empty="Rien pour l’instant. Ajoute une idée concrète sur l’établissement."
          onVote={vote}
        />
        <ClaimList
          title="Revendications nationales"
          claims={national.active}
          empty="Aucune revendication nationale listée."
          onVote={vote}
        />
        {dismissed.length > 0 ? (
          <ClaimList
            title="Propositions écartées par la communauté"
            claims={dismissed}
            empty=""
            onVote={vote}
          />
        ) : null}
      </div>
    </div>
  );
}
