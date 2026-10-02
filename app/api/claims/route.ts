import { NextRequest } from "next/server";
import { createClaim, listClaims } from "@/lib/db";
import { formatClaim } from "@/lib/groq";
import type { ClaimCategory } from "@/lib/types";

export async function GET(req: NextRequest) {
  const establishmentId = req.nextUrl.searchParams.get("establishmentId");
  if (!establishmentId) {
    return Response.json({ error: "establishmentId requis" }, { status: 400 });
  }
  const claims = await listClaims(establishmentId);
  return Response.json({ claims });
}

export async function POST(req: Request) {
  const { originalText, category, establishmentId } = await req.json();
  const text = String(originalText ?? "").trim();
  const cat = category as ClaimCategory;
  if (!text || text.length < 8) {
    return Response.json({ error: "Écris une revendication un peu plus précise." }, { status: 400 });
  }
  if (cat !== "local" && cat !== "national") {
    return Response.json({ error: "Catégorie invalide" }, { status: 400 });
  }
  if (!establishmentId) {
    return Response.json({ error: "Établissement manquant" }, { status: 400 });
  }

  const formattedTitle = await formatClaim(text);
  if (formattedTitle === "REJECTED") {
    return Response.json({ error: "Contenu inapproprié" }, { status: 400 });
  }

  const claim = await createClaim({
    establishment_id: establishmentId,
    category: cat,
    original_text: text,
    formatted_title: formattedTitle,
  });

  return Response.json({ success: true, formattedTitle, claim });
}
