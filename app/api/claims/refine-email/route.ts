import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { rawText, tone = "formel" } = await req.json();

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json({ error: "Le texte à corriger est vide." }, { status: 400 });
    }

    const systemPrompt = `Tu es un assistant rédactionnel institutionnel expert en communication étudiante et lycéenne.
Ta mission est de corriger les fautes d'orthographe, de grammaire et de ponctuation, tout en ajustant le niveau de langage pour qu'il soit professionnel, clair et percutant.
Le ton doit être ${tone === "formel" ? "soutenu et respectueux pour un envoi institutionnel (direction d'établissement, rectorat)" : "engagé et accessible"}.

Règles strictes :
1. Conserve scrupuleusement le sens et les revendications d'origine.
2. Ne rajoute pas d'informations inventées.
3. Retourne UNIQUEMENT le texte corrigé et reformulé, sans méta-commentaire ni formule d'introduction.`;

    // 1. TENTATIVE VIA MISTRAL AI
    const mistralKey = process.env.MISTRAL_API_KEY?.trim();
    if (mistralKey) {
      try {
        const responseMistral = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${mistralKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "mistral-small-latest",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: rawText },
            ],
            temperature: 0.2,
          }),
        });

        if (responseMistral.ok) {
          const data = await responseMistral.json();
          const refinedText = data.choices?.[0]?.message?.content?.trim();
          if (refinedText) {
            return NextResponse.json({ refinedText, provider: "mistral" });
          }
        } else {
          console.warn("Échec Mistral AI, passage au fallback Gemini...");
        }
      } catch (err) {
        console.warn("Erreur réseau Mistral AI, passage au fallback Gemini...", err);
      }
    }

    // 2. TENTATIVE VIA GOOGLE AI STUDIO (GEMINI) EN FALLBACK
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    if (geminiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const responseGemini = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: rawText }] }],
            generationConfig: { temperature: 0.2 },
          }),
        });

        if (responseGemini.ok) {
          const data = await responseGemini.json();
          const refinedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (refinedText) {
            return NextResponse.json({ refinedText, provider: "gemini" });
          }
        }
      } catch (err) {
        console.error("Erreur réseau Gemini :", err);
      }
    }

    return NextResponse.json(
      { error: "Aucun service d'IA n'a pu répondre. Vérifie MISTRAL_API_KEY et GEMINI_API_KEY." },
      { status: 500 }
    );
  } catch (error) {
    console.error("Erreur serveur POST /api/claims/refine-email :", error);
    return NextResponse.json({ error: "Erreur interne serveur." }, { status: 500 });
  }
}
