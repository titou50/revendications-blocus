import { NextRequest, NextResponse } from "next/server";

// 4 fournisseurs x 7 s = 28 s max, ce qui tient dans maxDuration
export const maxDuration = 30;

const TIMEOUT_MS = 7000;

// Fournisseurs compatibles OpenAI (Groq, Mistral, Hugging Face Router)
async function openAICompatible(
  url: string,
  key: string,
  model: string,
  system: string,
  text: string
): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: text },
      ],
      temperature: 0.2,
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const data = await res.json();
  const out = data.choices?.[0]?.message?.content?.trim();
  if (!out) throw new Error("Réponse vide");
  return out;
}

// Google Gemini (generateContent)
async function gemini(key: string, system: string, text: string): Promise<string> {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: {
          temperature: 0.2,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }
  );

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const data = await res.json();
  const out = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!out) throw new Error("Réponse vide");
  return out;
}

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

    const providers: {
      name: string;
      env: string;
      run: (key: string) => Promise<string>;
    }[] = [
      {
        name: "groq",
        env: "GROQ_API_KEY",
        run: (k) =>
          openAICompatible(
            "https://api.groq.com/openai/v1/chat/completions",
            k,
            "llama-3.3-70b-versatile",
            systemPrompt,
            rawText
          ),
      },
      {
        name: "mistral",
        env: "MISTRAL_API_KEY",
        run: (k) =>
          openAICompatible(
            "https://api.mistral.ai/v1/chat/completions",
            k,
            "mistral-small-latest",
            systemPrompt,
            rawText
          ),
      },
      {
        name: "gemini",
        env: "GEMINI_API_KEY",
        run: (k) => gemini(k, systemPrompt, rawText),
      },
      {
        name: "huggingface",
        env: "HF_TOKEN",
        run: (k) =>
          openAICompatible(
            "https://router.huggingface.co/v1/chat/completions",
            k,
            "Qwen/Qwen2.5-72B-Instruct",
            systemPrompt,
            rawText
          ),
      },
    ];

    const errorsLog: Record<string, string> = {};

    for (const p of providers) {
      const key = process.env[p.env]?.trim();
      if (!key) {
        errorsLog[p.name] = `${p.env} non définie dans l'environnement courant`;
        continue;
      }
      try {
        const refinedText = await p.run(key);
        return NextResponse.json({ refinedText, provider: p.name });
      } catch (e: any) {
        errorsLog[p.name] = e?.message || "Erreur réseau";
      }
    }

    // Visible dans les logs Vercel + renvoyé au client pour débogage
    console.error("Tous les providers IA ont échoué :", JSON.stringify(errorsLog));
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
