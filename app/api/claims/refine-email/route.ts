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

    const errorsLog: Record<string, string> = {};

    // 1. MISTRAL AI
    const mistralKey = process.env.MISTRAL_API_KEY?.trim();
    if (mistralKey) {
      try {
        const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
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

        if (res.ok) {
          const data = await res.json();
          const refinedText = data.choices?.[0]?.message?.content?.trim();
          if (refinedText) return NextResponse.json({ refinedText, provider: "mistral" });
        } else {
          const err = await res.text();
          errorsLog.mistral = `HTTP ${res.status}: ${err.slice(0, 150)}`;
        }
      } catch (e: any) {
        errorsLog.mistral = e?.message || "Erreur réseau";
      }
    } else {
      errorsLog.mistral = "Clé non définie dans l'environnement courant";
    }

    // 2. GOOGLE GEMINI (v1beta generateContent)
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    if (geminiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${systemPrompt}\n\nTexte à corriger :\n${rawText}` }],
              },
            ],
            generationConfig: { temperature: 0.2 },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const refinedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (refinedText) return NextResponse.json({ refinedText, provider: "gemini" });
        } else {
          const err = await res.text();
          errorsLog.gemini = `HTTP ${res.status}: ${err.slice(0, 150)}`;
        }
      } catch (e: any) {
        errorsLog.gemini = e?.message || "Erreur réseau";
      }
    } else {
      errorsLog.gemini = "Clé non définie dans l'environnement courant";
    }

    // 3. HUGGING FACE (Nouvel endpoint Router Serverless)
    const hfToken = process.env.HF_TOKEN?.trim();
    if (hfToken) {
      try {
        const res = await fetch(
          "https://router.huggingface.co/hf-inference/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${hfToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "Qwen/Qwen2.5-72B-Instruct",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: rawText },
              ],
              temperature: 0.2,
              max_tokens: 1024,
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const refinedText = data.choices?.[0]?.message?.content?.trim();
          if (refinedText) return NextResponse.json({ refinedText, provider: "huggingface" });
        } else {
          const err = await res.text();
          errorsLog.huggingface = `HTTP ${res.status}: ${err.slice(0, 150)}`;
        }
      } catch (e: any) {
        errorsLog.huggingface = e?.message || "Erreur réseau";
      }
    } else {
      errorsLog.huggingface = "Clé non définie dans l'environnement courant";
    }

    // Retour détaillé si tout échoue pour débogage immédiat
    return NextResponse.json(
      {
        error: "Échec de tous les providers IA.",
        details: errorsLog,
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("Erreur serveur POST /api/claims/refine-email :", error);
    return NextResponse.json({ error: "Erreur interne serveur." }, { status: 500 });
  }
}
