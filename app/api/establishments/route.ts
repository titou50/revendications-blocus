import { NextRequest } from "next/server";
import { searchEstablishments } from "@/lib/education";
import { recordVisit, upsertEstablishment } from "@/lib/db";
import { getSessionId, hashSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const city = req.nextUrl.searchParams.get("city")?.trim() ?? "";
  if (!q && !city) {
    return Response.json({ results: [] });
  }
  try {
    const results = await searchEstablishments(q, city);
    return Response.json({ results });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Recherche indisponible" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const code_uai = String(body.code_uai ?? "").trim();
  const name = String(body.name ?? "").trim();
  const city = String(body.city ?? "").trim();
  const type = String(body.type ?? "Établissement").trim();
  if (!code_uai || !name) {
    return Response.json({ error: "Établissement incomplet" }, { status: 400 });
  }

  const establishment = await upsertEstablishment({ code_uai, name, city, type });
  const session = hashSession(await getSessionId());
  const participant_count = await recordVisit(establishment.id, session);
  return Response.json({ ...establishment, participant_count });
}
