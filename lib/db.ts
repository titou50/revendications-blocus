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
  return updated;
}
