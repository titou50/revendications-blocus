import { voteClaim } from "@/lib/db";
import { getSessionId, hashSession } from "@/lib/session";
import type { VoteType } from "@/lib/types";

const TYPES: VoteType[] = ["against", "low_priority", "off_topic"];

export async function POST(req: Request) {
  const { claimId, voteType } = await req.json();
  if (!claimId || !TYPES.includes(voteType)) {
    return Response.json({ error: "Vote invalide" }, { status: 400 });
  }
  const session = hashSession(await getSessionId());
  const claim = await voteClaim({
    claim_id: claimId,
    user_session_id: session,
    vote_type: voteType,
  });
  return Response.json({ claim });
}
