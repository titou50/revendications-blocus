import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { claimId, voteType } = await req.json(); // voteType: 'up' | 'down'

    if (!claimId || (voteType !== "up" && voteType !== "down")) {
      return Response.json({ error: "Paramètres invalides" }, { status: 400 });
    }

    // Récupération de la revendication
    const { data: claim, error: fetchErr } = await supabaseAdmin
      .from("claims")
      .select("*")
      .eq("id", claimId)
      .single();

    if (fetchErr || !claim) {
      return Response.json({ error: "Revendication introuvable" }, { status: 404 });
    }

    const newUp = voteType === "up" ? (claim.upvotes || 0) + 1 : claim.upvotes || 0;
    const newDown = voteType === "down" ? (claim.downvotes || 0) + 1 : claim.downvotes || 0;

    // Mise à jour atomic des compteurs
    const { data: updatedClaim, error: updateErr } = await supabaseAdmin
      .from("claims")
      .update({
        upvotes: newUp,
        downvotes: newDown,
        score: newUp - newDown,
      })
      .eq("id", claimId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return Response.json({ success: true, claim: updatedClaim });
  } catch (error) {
    console.error("Erreur vote :", error);
    return Response.json({ error: "Erreur lors de l'enregistrement du vote" }, { status: 500 });
  }
}
