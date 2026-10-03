import { createClient } from "@supabase/supabase-js";
import type { Claim, Establishment, VoteType } from "@/lib/types";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- ÉTABLISSEMENTS ---

export async function getEstablishment(id: string): Promise<Establishment | null> {
  const { data, error } = await supabaseAdmin
    .from("establishments")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Establishment;
}

export async function upsertEstablishment(est: {
  id?: string;
  code_uai?: string;
  name: string;
  city: string;
  type: string;
}): Promise<Establishment> {
  const targetId = est.id ?? est.code_uai;
  if (!targetId) throw new Error("Un identifiant ou code UAI est requis");

  const { data, error } = await supabaseAdmin
    .from("establishments")
    .upsert(
      {
        id: targetId,
        code_uai: est.code_uai ?? targetId,
        name: est.name,
        city: est.city,
        type: est.type,
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as Establishment;
}

export async function recordVisit(
  establishmentId: string,
  sessionHash: string
): Promise<number> {
  await supabaseAdmin
    .from("visits")
    .upsert(
      { establishment_id: establishmentId, session_hash: sessionHash },
      { onConflict: "establishment_id,session_hash" }
    );

  const { count } = await supabaseAdmin
    .from("visits")
    .select("*", { count: "exact", head: true })
    .eq("establishment_id", establishmentId);

  const total = count ?? 1;

  await supabaseAdmin
    .from("establishments")
    .update({ participant_count: total })
    .eq("id", establishmentId);

  return total;
}

// --- REVENDICATIONS ---

export async function listClaims(establishmentId: string): Promise<Claim[]> {
  const { data, error } = await supabaseAdmin
    .from("claims")
    .select("*")
    .eq("establishment_id", establishmentId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as Claim[]) ?? [];
}

export async function createClaim(claim: {
  id?: string;
  establishment_id: string;
  category: "local" | "national";
  original_text: string;
  formatted_title: string;
}): Promise<Claim> {
  const { data, error } = await supabaseAdmin
    .from("claims")
    .insert({
      id: claim.id ?? crypto.randomUUID(),
      establishment_id: claim.establishment_id,
      category: claim.category,
      original_text: claim.original_text,
      formatted_title: claim.formatted_title,
      status: "active",
      upvotes: 0,
      downvotes: 0,
      score: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Claim;
}

export async function voteClaim(
  claimId: string,
  voteType: VoteType,
  sessionHash: string
): Promise<Claim | null> {
  const { data: claim, error: fetchErr } = await supabaseAdmin
    .from("claims")
    .select("*")
    .eq("id", claimId)
    .single();

  if (fetchErr || !claim) return null;

  // 1. Récupération du vote existant pour cette session
  const { data: existingVote } = await supabaseAdmin
    .from("votes")
    .select("vote_type")
    .eq("claim_id", claimId)
    .eq("session_hash", sessionHash)
    .maybeSingle();

  let upDelta = 0;
  let downDelta = 0;

  if (existingVote) {
    // Si la session a déjà voté la même chose, on bloque
    if (existingVote.vote_type === voteType) {
      return claim as Claim;
    }

    // Si la session change d'avis (ex: up -> down)
    if (voteType === "up") {
      upDelta = 1;
      downDelta = -1;
    } else {
      upDelta = -1;
      downDelta = 1;
    }

    await supabaseAdmin
      .from("votes")
      .update({ vote_type: voteType })
      .eq("claim_id", claimId)
      .eq("session_hash", sessionHash);
  } else {
    // Premier vote de la session pour cette revendication
    if (voteType === "up") {
      upDelta = 1;
    } else {
      downDelta = 1;
    }

    await supabaseAdmin
      .from("votes")
      .insert({ claim_id: claimId, session_hash: sessionHash, vote_type: voteType });
  }

  const newUp = Math.max(0, (claim.upvotes || 0) + upDelta);
  const newDown = Math.max(0, (claim.downvotes || 0) + downDelta);

  const { data: updated, error: updateErr } = await supabaseAdmin
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
  return updated as Claim;
}
