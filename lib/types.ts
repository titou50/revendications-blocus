export type ClaimCategory = "local" | "national";
export type ClaimStatus = "active" | "dismissed" | "archived";
export type VoteType = "up" | "down";

export interface Establishment {
  id: string;
  name: string;
  city: string;
  type: string;
  code_uai?: string;
  participant_count: number;
}

export interface EstablishmentSearchHit {
  id: string;
  name: string;
  city: string;
  type: string;
  code_uai?: string;
}

export interface Claim {
  id: string;
  establishment_id: string;
  category: ClaimCategory;
  original_text: string;
  formatted_title: string;
  status?: ClaimStatus;
  upvotes?: number;
  downvotes?: number;
  score?: number;
  created_at?: string;
}
