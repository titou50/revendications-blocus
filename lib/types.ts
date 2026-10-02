export type ClaimCategory = "local" | "national";
export type ClaimStatus = "active" | "flagged" | "archived";
export type VoteType = "against" | "low_priority" | "off_topic";

export type Establishment = {
  id: string;
  code_uai: string;
  name: string;
  city: string;
  type: string;
  participant_count: number;
};

export type Claim = {
  id: string;
  establishment_id: string;
  category: ClaimCategory;
  original_text: string;
  formatted_title: string;
  created_at: string;
  votes_against: number;
  votes_low_priority: number;
  votes_off_topic: number;
  status: ClaimStatus;
};

export type Vote = {
  id: string;
  claim_id: string;
  user_session_id: string;
  vote_type: VoteType;
  created_at: string;
};

export type EstablishmentSearchHit = {
  code_uai: string;
  name: string;
  city: string;
  type: string;
};

export const DISMISSAL_SCORE = 15;

export function claimScore(claim: Claim): number {
  return (
    claim.votes_low_priority * 1 +
    claim.votes_against * 2 +
    claim.votes_off_topic * 2
  );
}

export function isDismissed(claim: Claim): boolean {
  return claim.status === "flagged" || claimScore(claim) > DISMISSAL_SCORE;
}
