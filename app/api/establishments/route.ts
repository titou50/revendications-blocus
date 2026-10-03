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

    // 1. Insertion / Upsert BDD
    let establishment;
    try {
      establishment = await upsertEstablishment({
        id: code_uai,
        code_uai,
        name,
        city,
        type,
      });
    } catch (dbErr) {
      console.error("Erreur upsertEstablishment :", dbErr);
      return NextResponse.json(
        { error: `Erreur BDD Supabase: ${dbErr instanceof Error ? dbErr.message : "Upsert échec"}` },
        { status: 500 }
      );
    }

    // 2. Gestion Session & Visite
    let participant_count = 1;
    try {
      const rawSessionId = await getSessionId();
      const session = hashSession(rawSessionId);
      participant_count = await recordVisit(establishment.id, session);
    } catch (sessionErr) {
      console.error("Erreur recordVisit/session :", sessionErr);
      // On tolère l'échec de comptage pour ne pas bloquer l'accès à l'établissement
    }

    // 3. Réponse valide
    return NextResponse.json({
      ...establishment,
      participant_count,
    });
  } catch (error) {
    console.error("Erreur globale POST /api/establishments :", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur critique" },
      { status: 500 }
    );
  }
}
