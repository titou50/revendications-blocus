import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { claimScore, DISMISSAL_SCORE, type Claim, type ClaimCategory, type Establishment, type VoteType } from "@/lib/types";

type Store = {
  establishments: Establishment[];
  claims: Claim[];
  votes: {
    id: string;
    claim_id: string;
    user_session_id: string;
    vote_type: VoteType;
    created_at: string;
  }[];
  visits: { establishment_id: string; user_session_id: string }[];
};

const emptyStore = (): Store => ({
  establishments: [],
  claims: [],
  votes: [],
  visits: [],
});

const DATA_FILE = path.join(process.cwd(), "data", "db.json");

let writeQueue: Promise<void> = Promise.resolve();

async function readFileStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return { ...emptyStore(), ...JSON.parse(raw) };
  } catch {
    return emptyStore();
  }
}

async function writeFileStore(store: Store): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(tmp, DATA_FILE);
}

function withFileStore<T>(fn: (store: Store) => Promise<T> | T): Promise<T> {
  const run = writeQueue.then(async () => {
    const store = await readFileStore();
    const result = await fn(store);
    await writeFileStore(store);
    return result;
  });
  writeQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function useSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function supabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
  if (useSupabase()) {
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

  return withFileStore((store) => {
    const found = store.establishments.find((e) => e.code_uai === input.code_uai);
    if (found) return found;
    const created: Establishment = {
      id: randomUUID(),
      participant_count: 0,
      ...input,
    };
    store.establishments.push(created);
    return created;
  });
}

export async function getEstablishment(id: string): Promise<Establishment | null> {
  if (useSupabase()) {
    const { data, error } = await supabase()
      .from("establishments")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as Establishment) ?? null;
  }
  const store = await readFileStore();
  return store.establishments.find((e) => e.id === id) ?? null;
}

export async function recordVisit(establishmentId: string, sessionHash: string): Promise<number> {
  if (useSupabase()) {
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

  return withFileStore((store) => {
    const exists = store.visits.some(
      (v) => v.establishment_id === establishmentId && v.user_session_id === sessionHash
    );
    if (!exists) {
      store.visits.push({
        establishment_id: establishmentId,
        user_session_id: sessionHash,
      });
    }
    const n = store.visits.filter((v) => v.establishment_id === establishmentId).length;
    const est = store.establishments.find((e) => e.id === establishmentId);
    if (est) est.participant_count = n;
    return n;
  });
}

export async function listClaims(establishmentId: string): Promise<Claim[]> {
  if (useSupabase()) {
    const { data, error } = await supabase()
      .from("claims")
      .select("*")
      .eq("establishment_id", establishmentId)
      .neq("status", "archived");
    if (error) throw error;
    return (data ?? []).map((row) => mapClaim(row as Record<string, unknown>));
  }
  const store = await readFileStore();
  return store.claims.filter(
    (c) => c.establishment_id === establishmentId && c.status !== "archived"
  );
}

export async function createClaim(input: {
  establishment_id: string;
  category: ClaimCategory;
  original_text: string;
  formatted_title: string;
}): Promise<Claim> {
  const row: Claim = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    votes_against: 0,
    votes_low_priority: 0,
    votes_off_topic: 0,
    status: "active",
    ...input,
  };

  if (useSupabase()) {
    const { data, error } = await supabase().from("claims").insert(row).select("*").single();
    if (error) throw error;
    return mapClaim(data as Record<string, unknown>);
  }

  return withFileStore((store) => {
    store.claims.push(row);
    return row;
  });
}

export async function voteClaim(input: {
  claim_id: string;
  user_session_id: string;
  vote_type: VoteType;
}): Promise<Claim> {
  if (useSupabase()) {
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

  return withFileStore((store) => {
    const claim = store.claims.find((c) => c.id === input.claim_id);
    if (!claim) throw new Error("Revendication introuvable");
    const existing = store.votes.find(
      (v) => v.claim_id === input.claim_id && v.user_session_id === input.user_session_id
    );
    if (existing) {
      existing.vote_type = input.vote_type;
    } else {
      store.votes.push({
        id: randomUUID(),
        created_at: new Date().toISOString(),
        ...input,
      });
    }
    const related = store.votes.filter((v) => v.claim_id === input.claim_id);
    claim.votes_against = related.filter((v) => v.vote_type === "against").length;
    claim.votes_low_priority = related.filter((v) => v.vote_type === "low_priority").length;
    claim.votes_off_topic = related.filter((v) => v.vote_type === "off_topic").length;
    claim.status = claimScore(claim) > DISMISSAL_SCORE ? "flagged" : "active";
    return claim;
  });
}
