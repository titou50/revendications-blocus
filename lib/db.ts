import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { claimScore, DISMISSAL_SCORE, type Claim, type ClaimCategory, type Establishment, type VoteType } from "@/lib/types";

function getServiceKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
}

function checkEnv() {
  if (process.env.NODE_ENV === "production" && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !getServiceKey())) {
    throw new Error(
      "🔴 ERREUR CRITIQUE : Variables Supabase manquantes sur Vercel. Vérifiez NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY."
    );
  }
}

function supabase(): SupabaseClient {
  checkEnv();
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
    getServiceKey() || "placeholder-key",
    { auth: { persistSession: false } }
  );
}

function mapClaim(row: Record<string, unknown>): Claim {
  return {
    id: String(row.id),
    establishment_id: String(row.establishment_id),
    category: row.category as ClaimCategory,
    original_text: String(row.original_text ?? ""),
    formatted_title: String(row.formatted_title ?? ""),
    created_at: String(row.created_at),
    votes_against: Number(row.votes_against ?? 0),
    votes_low_priority: Number(row.votes_low_priority ?? 0),
    votes_off_topic: Number(row.votes_off_topic ?? 0),
    status: (row.status as Claim["status"]) ?? "active",
  };
}

export async function upsertEstablishment(input: {
  code_uai: string;
  name: string;
  city: string;
  type: string;
}): Promise<Establishment> {
  const db = supabase();
  const { data: existing } = await db
    .from("establishments")
    .select("*")
    .eq("code_uai", input.code_uai)
    .maybeSingle();

  if (existing) return existing as Establishment;

  const { data, error } = await db
    .from("establishments")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return { ...(data as Establishment), participant_count: data.participant_count ?? 0 };
}

export async function getEstablishment(id: string): Promise<Establishment | null> {
  const { data, error } = await supabase()
    .from("establishments")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as Establishment) ?? null;
}

export async function recordVisit(establishmentId: string, sessionHash: string): Promise<number> {
  const db = supabase();
  await db.from("visits").upsert(
    { establishment_id: establishmentId, user_session_id: sessionHash },
    { onConflict: "establishment_id,user_session_id", ignoreDuplicates: true }
  );

  const { count } = await db
    .from("visits")
    .select("*", { count: "exact", head: true })
    .eq("establishment_id", establishmentId);

  const n = count ?? 0;
  await db.from("establishments").update({ participant_count: n }).eq("id", establishmentId);
  return n;
}

export async function listClaims(establishmentId: string): Promise<Claim[]> {
  const { data, error } = await supabase()
    .from("claims")
    .select("*")
    .eq("establishment_id", establishmentId)
    .neq("status", "archived");

  if (error) throw error;
  return (data ?? []).map((row) => mapClaim(row as Record<string, unknown>));
}

export async function createClaim(input: {
  establishment_id: string;
  category: ClaimCategory;
  original_text: string;
  formatted_title: string;
}): Promise<Claim> {
  const row = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    votes_against: 0,
    votes_low_priority: 0,
    votes_off_topic: 0,
    status: "active",
    ...input,
  };

  const { data, error } = await supabase().from("claims").insert(row).select("*").single();
  if (error) throw error;
  return mapClaim(data as Record<string, unknown>);
}

export async function voteClaim(input: {
  claim_id: string;
  user_session_id: string;
  vote_type: VoteType;
}): Promise<Claim> {
  const db = supabase();
  const { data: existing } = await db
    .from("votes")
    .select("*")
    .eq("claim_id", input.claim_id)
    .eq("user_session_id", input.user_session_id)
    .maybeSingle();

  if (existing) {
    if (existing.vote_type === input.vote_type) {
      const { data: claim } = await db.from("claims").select("*").eq("id", input.claim_id).single();
      return mapClaim(claim as Record<string, unknown>);
    }
    await db
      .from("votes")
      .update({ vote_type: input.vote_type })
      .eq("id", existing.id);
  } else {
    await db.from("votes").insert({
      claim_id: input.claim_id,
      user_session_id: input.user_session_id,
      vote_type: input.vote_type,
    });
  }

  const { data: votes } = await db.from("votes").select("vote_type").eq("claim_id", input.claim_id);
  const counts = { against: 0, low_priority: 0, off_topic: 0 };
  for (const vote of votes ?? []) {
    counts[vote.vote_type as VoteType] += 1;
  }

  const patch = {
    votes_against: counts.against,
    votes_low_priority: counts.low_priority,
    votes_off_topic: counts.off_topic,
  };

  const { data: claim } = await db.from("claims").select("*").eq("id", input.claim_id).single();
  const mapped = mapClaim({ ...(claim as object), ...patch });
  const status = claimScore(mapped) > DISMISSAL_SCORE ? "flagged" : "active";

  const { data: updated, error } = await db
    .from("claims")
    .update({ ...patch, status })
    .eq("id", input.claim_id)
    .select("*")
    .single();

  if (error) throw error;
  return mapClaim(updated as Record<string, unknown>);
}
