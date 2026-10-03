import { NextRequest, NextResponse } from "next/server";
import { searchEstablishments } from "@/lib/education";
import { recordVisit, upsertEstablishment } from "@/lib/db";
import { getSessionId, hashSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const city = req.nextUrl.searchParams.get("city")?.trim() ?? "";
  
  if (!q && !city) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchEstablishments(q, city);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Erreur GET /api/establishments :", error);
    return NextResponse.json({ error: "Recherche indisponible" }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const code_uai = String(body.code_uai ?? body.id ?? "").trim();
    const name = String(body.name ?? "").trim();
    const city = String(body.city ?? "").trim();
    const type = String(body.type ?? "Établissement").trim();

    if (!code_uai || !name) {
      return NextResponse.json(
        { error: "Établissement incomplet (code UAI ou nom manquant)" },
        { status: 400 }
      );
    }

    // 1. Insertion / Mise à jour en BDD
    const establishment = await upsertEstablishment({
      id: code_uai,
      code_uai,
      name,
      city,
      type,
    });

    // 2. Traitement de la session et enregistrement de la visite
    const sessionId = getSessionId(req);
    const session = hashSession(sessionId);
    const participant_count = await recordVisit(establishment.id, session);

    // 3. Réponse JSON explicite
    return NextResponse.json({
      ...establishment,
      participant_count,
    });
  } catch (error) {
    console.error("Erreur POST /api/establishments :", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur lors de la sélection de l'établissement" },
      { status: 500 }
    );
  }
}
