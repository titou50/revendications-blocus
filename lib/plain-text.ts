import type { Claim, Establishment } from "@/lib/types";
import { partitionClaims } from "@/lib/score";

function section(title: string, claims: Claim[]): string[] {
  if (claims.length === 0) return [title, "—"];
  return [title, ...claims.map((claim) => `• ${claim.formatted_title}`)];
}

export function buildPlainText(establishment: Establishment, claims: Claim[]): string {
  const local = partitionClaims(claims.filter((c) => c.category === "local"));
  const national = partitionClaims(claims.filter((c) => c.category === "national"));

  return [
    establishment.name.toUpperCase(),
    `${establishment.city} — ${establishment.type}`,
    "",
    ...section("Revendications locales", local.active),
    "",
    ...section("Revendications nationales", national.active),
    "",
    ...(local.dismissed.length || national.dismissed.length
      ? section("Propositions écartées par la communauté", [
          ...local.dismissed,
          ...national.dismissed,
        ])
      : []),
  ]
    .join("\n")
    .trim();
}
