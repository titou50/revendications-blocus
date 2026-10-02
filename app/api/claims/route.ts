import { NextRequest } from "next/server";
import { createClaim, listClaims } from "@/lib/db";
import { formatClaim } from "@/lib/groq";
import type { ClaimCategory } from "@/lib/types";

export async function GET(req: NextRequest) {
  const establishmentId = req.nextUrl.searchParams.get("establishmentId");
  if (!establishmentId) {
    return Response.json({ error: "establishmentId requis" }, { status: 400 });
  }
  
  try {
    const claims = await listClaims(establishmentId);
    return Response.json({ claims });
  } catch (error) {
    console.error("Erreur GET /api/claims :", error);
    return Response.json({ error: "Erreur lors de la récupération des revendications" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { originalText, category, establishmentId } = await req.json();
    const text = String(originalText ?? "").trim();
    const cat = category as ClaimCategory;

    // 1. Validation de la longueur
    if (!text || text.length < 8) {
      return Response.json({ error: "Écris une revendication un peu plus précise (min. 8 caractères)." }, { status: 400 });
    }
    if (text.length > 500) {
      return Response.json({ error: "La revendication est trop longue (max. 500 caractères)." }, { status: 400 });
    }

    // 2. Validation des champs
    if (cat !== "local" && cat !== "national") {
      return Response.json({ error: "Catégorie invalide" }, { status: 400 });
    }
    if (!establishmentId) {
      return Response.json({ error: "Établissement manquant" }, { status: 400 });
    }

    // 3. Reformulation IA + Modération
    let formattedTitle: string;
    try {
      formattedTitle = await formatClaim(text);
    } catch (err: any) {
      return Response.json(
        { error: err.message || "Contenu non conforme aux règles de modération." }, 
        { status: 400 }
      );
    }

    // 4. Insertion en BDD Supabase
    const claim = await createClaim({
      establishment_id: establishmentId,
      category: cat,
      original_text: text,
      formatted_title: formattedTitle,
    });

    return Response.json({ success: true, formattedTitle, claim }, { status: 201 });
  } catch (error) {
    console.error("Erreur POST /api/claims :", error);
    return Response.json({ error: "Erreur serveur lors de la création de la revendication" }, { status: 500 });
  }
}
