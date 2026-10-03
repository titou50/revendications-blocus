import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { rawText, tone = "formel" } = await req.json();

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json({ error: "Le texte à corriger est vide." }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("GROQ_API_KEY absente des variables d'environnement Vercel.");
      return NextResponse.json(
        { error: "Clé API Groq manquante (GROQ_API_KEY non configurée sur Vercel)." },
        { status: 500 }
      );
    }

    const systemPrompt = `Tu es un assistant rédactionnel institutionnel expert en communication étudiante et lycéenne.
Ta mission est de corriger les fautes d'orthographe, de grammaire et de ponctuation, tout en ajustant le niveau de langage pour qu'il soit professionnel, clair et percutant.
Le ton doit être ${tone === "formel" ? "soutenu et respectueux pour un envoi institutionnel (direction d'établissement, rectorat)" : "engagé et accessible"}.

Règles strictes :
1. Conserve scrupuleusement le sens et les revendications d'origine.
2. Ne rajoute pas d'informations inventées.
3. Retourne UNIQUEMENT le texte corrigé et reformulé, sans méta-commentaire ni formule d'introduction (ne dis jamais "Voici le texte corrigé :").`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: rawText },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("Erreur renvoyée par l'API Groq :", errData);
      return NextResponse.json(
        { error: errData.error?.message || `Erreur API Groq (${response.status})` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const refinedText = data.choices?.[0]?.message?.content?.trim();

    if (!refinedText) {
      return NextResponse.json(
        { error: "La réponse de l'IA est vide." },
        { status: 500 }
      );
    }

    return NextResponse.json({ refinedText });
  } catch (error) {
    console.error("Erreur serveur POST /api/claims/refine-email :", error);
    return NextResponse.json(
      { error: "Erreur interne lors du traitement du texte." },
      { status: 500 }
    );
  }
}
