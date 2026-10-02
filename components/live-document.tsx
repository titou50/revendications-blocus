"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AddClaimDialog } from "@/components/add-claim-dialog";
import { ClaimList } from "@/components/claim-list";
import { ExportBar } from "@/components/export-bar";
import { Badge } from "@/components/ui/badge";
import { buildPlainText } from "@/lib/plain-text";
import { partitionClaims } from "@/lib/score";
import type { Claim, Establishment, VoteType } from "@/lib/types";

export function LiveDocument({
  establishment,
  initialClaims,
}: {
  establishment: Establishment;
  initialClaims: Claim[];
}) {
  const [claims, setClaims] = useState(initialClaims);
  const [participants, setParticipants] = useState(establishment.participant_count);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/claims?establishmentId=${establishment.id}`);
    if (!res.ok) return;
    const data = await res.json();
    setClaims(data.claims ?? []);
  }, [establishment.id]);

  useEffect(() => {
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    setParticipants(establishment.participant_count);
  }, [establishment.participant_count]);

  async function vote(claimId: string, voteType: VoteType) {
    const res = await fetch("/api/claims/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimId, voteType }),
    });
    const data = await res.json();
    if (!res.ok) return;
    setClaims((prev) => prev.map((c) => (c.id === data.claim.id ? data.claim : c)));
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
  const copyText = useMemo(
    () => buildPlainText({ ...establishment, participant_count: participants }, claims),
    [claims, establishment, participants]
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-36 pt-8">
      <header className="mb-10 border-b border-dashed pb-6">
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">
          Document live
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-instrument)] text-4xl leading-tight sm:text-5xl">
          {establishment.name}
        </h1>
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
          onCreated={(claim) => setClaims((prev) => [claim, ...prev])}
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

      <ExportBar establishmentId={establishment.id} copyText={copyText} />
    </div>
  );
}
