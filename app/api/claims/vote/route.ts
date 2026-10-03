import { NextRequest } from "next/server";
import { voteClaim } from "@/lib/db";
import { getSessionId, hashSession } from "@/lib/session";
import type { VoteType } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { claimId, voteType } = await req.json();

    if (!claimId || (voteType !== "up" && voteType !== "down")) {
      return Response.json({ error: "Paramètres invalides" }, { status: 400 });
    }

    // Récupération de l'identifiant de session de l'utilisateur
    const session = hashSession(await getSessionId());

    // Passage du hash de session à la fonction de vote en BDD
    const updatedClaim = await voteClaim(claimId, voteType as VoteType, session);

    if (!updatedClaim) {
      return Response.json({ error: "Revendication introuvable ou vote refusé" }, { status: 404 });
    }

    return Response.json({ success: true, claim: updatedClaim });
  } catch (error) {
    console.error("Erreur POST /api/claims/vote :", error);
    return Response.json(
      { error: "Erreur lors de l'enregistrement du vote" },
      { status: 500 }
    );
  }
}
