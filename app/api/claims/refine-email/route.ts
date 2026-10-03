import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const TIMEOUT_MS = 10000; // appel de génération
const LIST_TIMEOUT_MS = 4000; // appel de découverte des modèles

// Cache en mémoire (valable tant que l'instance serverless reste chaude)
const modelCache: Record<string, string> = {};

// ---------- Nettoyage du Markdown résiduel ----------
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1") // **gras**
    .replace(/__(.+?)__/g, "$1") // __gras__
    .replace(/^#{1,6}\s+/gm, "") // # titres
    .replace(/`([^`]+)`/g, "$1") // `code`
    .trim();
}

// ---------- Groq : découverte dynamique du modèle disponible ----------
const GROQ_PREFERRED = [
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "llama-3.1-8b-instant",
];

async function pickGroqModel(key: string): Promise<string> {
  if (modelCache.groq) return modelCache.groq;
  const res = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(LIST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Liste modèles HTTP ${res.status}`);
  const data = await res.json();
  const ids: string[] = (data.data ?? []).map((m: any) => m.id);
  const chosen =
    GROQ_PREFERRED.find((m) => ids.includes(m)) ??
    ids.find((id) => !/whisper|tts|guard|orpheus|embed|compound/i.test(id));
  if (!chosen) throw new Error("Aucun modèle de chat accessible avec cette clé Groq");
  modelCache.groq = chosen;
  return chosen;
}

// ---------- Gemini : découverte dynamique du modèle "flash" le plus récent ----------
async function pickGeminiModel(key: string): Promise<string> {
  if (modelCache.gemini) return modelCache.gemini;
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
    headers: { "x-goog-api-key": key },
    signal: AbortSignal.timeout(LIST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Liste modèles HTTP ${res.status}`);
  const data = await res.json();
  const candidates: { id: string; v: number }[] = (data.models ?? [])
    .filter((m: any) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
    .map((m: any) => String(m.name).replace("models/", ""))
    .map((id: string) => ({ id, m: id.match(/^gemini-(\d+(?:\.\d+)?)-flash$/) }))
    .filter((x: any) => x.m)
    .map((x: any) => ({ id: x.id, v: parseFloat(x.m[1]) }))
    .sort((a: any, b: any) => b.v - a.v);
  if (candidates.length === 0) throw new Error("Aucun modèle Gemini flash accessible");
  modelCache.gemini = candidates[0].id;
  return modelCache.gemini;
}

// ---------- Appels génériques ----------
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
      max_tokens: 2048,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} (${model}): ${(await res.text()).slice(0, 200)}`);
  }

  const data = await res.json();
  const out = data.choices?.[0]?.message?.content?.trim();
  if (!out) throw new Error(`Réponse vide (${model})`);
  return out;
}

async function gemini(key: string, system: string, text: string): Promise<string> {
  const model = await pickGeminiModel(key);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: { temperature: 0.2 },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }
  );

  if (!res.ok) {
    // On oublie le modèle en cache pour retenter la découverte à la prochaine requête
    delete modelCache.gemini;
    throw new Error(`HTTP ${res.status} (${model}): ${(await res.text()).slice(0, 200)}`);
  }

  const data = await res.json();
  const out = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!out) throw new Error(`Réponse vide (${model})`);
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const { rawText, tone = "formel" } = await req.json();

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json({ error: "Le texte à corriger est vide." }, { status: 400 });
    }

    const systemPrompt = `Tu reçois un e-mail contenant une liste de revendications d'élèves ou d'étudiants.
Ta seule tâche : réécrire chaque revendication de la liste. Tout le reste de l'e-mail (objet, formule d'appel, introduction, conclusion, signature, saluts, sauts de ligne, ponctuation hors revendications) doit être recopié MOT POUR MOT, sans le moindre changement.

Pour chaque revendication : corrige l'orthographe, la grammaire et la ponctuation, et reformule-la dans un langage ${tone === "formel" ? "soutenu et respectueux (direction d'établissement, rectorat)" : "engagé et accessible"}, clair et percutant. Conserve son sens, sans rien inventer. Si une revendication est totalement dénuée de sens, supprime-la.

Le style doit sonner naturel et humain, comme écrit par un élève ou un étudiant sincère : évite les formules génériques et les tournures typiques d'une IA (« il est essentiel de », « il est primordial de », « n'hésitez pas à »), les mots pompeux et les tirets longs.

Conserve les marqueurs de liste (numéros, tirets) et la structure d'origine. Réponds uniquement avec l'e-mail complet, sans commentaire ni introduction, en texte brut : n'ajoute aucun Markdown (pas de ** ni de #).`;

    const providers: {
      name: string;
      env: string;
      run: (key: string) => Promise<string>;
    }[] = [
      {
        name: "groq",
        env: "GROQ_API_KEY",
        run: async (k) => {
          const model = await pickGroqModel(k);
          try {
            return await openAICompatible(
              "https://api.groq.com/openai/v1/chat/completions",
              k,
              model,
              systemPrompt,
              rawText
            );
          } catch (e) {
            delete modelCache.groq;
            throw e;
          }
        },
      },
      {
        name: "gemini",
        env: "GEMINI_API_KEY",
        run: (k) => gemini(k, systemPrompt, rawText),
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
        const refinedText = stripMarkdown(await p.run(key));
        return NextResponse.json({ refinedText, provider: p.name });
      } catch (e: any) {
        errorsLog[p.name] = e?.message || "Erreur réseau";
      }
    }

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
