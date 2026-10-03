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

export async function voteClaim(claimId: string, voteType: VoteType): Promise<Claim | null> {
  const { data: claim, error: fetchErr } = await supabaseAdmin
    .from("claims")
    .select("*")
    .eq("id", claimId)
    .single();

  if (fetchErr || !claim) return null;

  const newUp = voteType === "up" ? (claim.upvotes || 0) + 1 : claim.upvotes || 0;
  const newDown = voteType === "down" ? (claim.downvotes || 0) + 1 : claim.downvotes || 0;

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
