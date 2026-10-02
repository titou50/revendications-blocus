import { NextRequest } from "next/server";
import { createClaim, listClaims } from "@/lib/db";
import { formatClaim } from "@/lib/groq";
import type { ClaimCategory } from "@/lib/types";

// Stockage en mémoire pour le Rate Limiting par IP
const ipCache = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipCache.get(ip);

  // Nettoyage régulier du cache si expiré
  if (entry && now > entry.resetAt) {
    ipCache.delete(ip);
  }

  const currentEntry = ipCache.get(ip);

  if (!currentEntry) {
    ipCache.set(ip, { count: 1, resetAt: now + 60 * 1000 }); // Fenêtre de 1 min
    return false;
  }

  if (currentEntry.count >= 3) {
    return true; // Bloqué si > 3 publications / minute
  }

  currentEntry.count += 1;
  return false;
}

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
    return Response.json(
      { error: "Erreur lors de la récupération des revendications" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // 1. Récupération de l'IP du client et Rate Limit
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

  if (isRateLimited(clientIp)) {
    return Response.json(
      { error: "Trop de publications. Attends une minute avant de réessayer." },
      { status: 429 }
    );
  }

  try {
    const { originalText, category, establishmentId } = await req.json();
    const text = String(originalText ?? "").trim();
    const cat = category as ClaimCategory;

    // 2. Validation de la longueur
    if (!text || text.length < 8) {
      return Response.json(
        { error: "Écris une revendication un peu plus précise (min. 8 caractères)." },
        { status: 400 }
      );
    }
    if (text.length > 500) {
      return Response.json(
        { error: "La revendication est trop longue (max. 500 caractères)." },
        { status: 400 }
      );
    }

    // 3. Validation des champs
    if (cat !== "local" && cat !== "national") {
      return Response.json({ error: "Catégorie invalide" }, { status: 400 });
    }
    if (!establishmentId) {
      return Response.json({ error: "Établissement manquant" }, { status: 400 });
    }

    // 4. Reformulation IA + Modération Groq
    let formattedTitle: string;
    try {
      formattedTitle = await formatClaim(text);
    } catch (err: any) {
      return Response.json(
        { error: err.message || "Contenu non conforme aux règles de modération." },
        { status: 400 }
      );
    }

    // 5. Insertion en BDD Supabase
    const claim = await createClaim({
      establishment_id: establishmentId,
      category: cat,
      original_text: text,
      formatted_title: formattedTitle,
    });

    return Response.json({ success: true, formattedTitle, claim }, { status: 201 });
  } catch (error) {
    console.error("Erreur POST /api/claims :", error);
    return Response.json(
      { error: "Erreur serveur lors de la création de la revendication" },
      { status: 500 }
    );
  }
}
