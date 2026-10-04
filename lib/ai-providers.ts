// Chaîne de fournisseurs IA partagée (Groq -> Gemini -> Mistral -> Hugging Face).
// Utilisée par /api/claims/refine-email et /api/claims/clean-claims.

const TIMEOUT_MS = 10000; // appel de génération
const LIST_TIMEOUT_MS = 4000; // appel de découverte des modèles

// Cache en mémoire (valable tant que l'instance serverless reste chaude)
const modelCache: Record<string, string> = {};

export class AllProvidersFailedError extends Error {
  details: Record<string, string>;
  constructor(details: Record<string, string>) {
    super("Échec de tous les providers IA.");
    this.name = "AllProvidersFailedError";
    this.details = details;
  }
}

// ---------- Nettoyage du Markdown résiduel ----------
export function stripMarkdown(text: string): string {
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
  const ids: string[] = (data.data ?? []).map((m: { id: string }) => m.id);
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
  const candidates: { id: string; v: number }[] = (
    (data.models ?? []) as { name: string; supportedGenerationMethods?: string[] }[]
  )
    .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
    .map((m) => String(m.name).replace("models/", ""))
    .map((id) => ({ id, m: id.match(/^gemini-(\d+(?:\.\d+)?)-flash$/) }))
    .filter((x): x is { id: string; m: RegExpMatchArray } => x.m !== null)
    .map((x) => ({ id: x.id, v: parseFloat(x.m[1]) }))
    .sort((a, b) => b.v - a.v);
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
  text: string,
  maxTokens: number
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
      max_tokens: maxTokens,
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

async function gemini(
  key: string,
  system: string,
  text: string,
  maxTokens: number
): Promise<string> {
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
        generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
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

// ---------- Point d'entrée : essaie chaque fournisseur à tour de rôle ----------
export async function generateWithFallback(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<{ text: string; provider: string }> {
  const { system, user, maxTokens = 2048 } = opts;

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
            system,
            user,
            maxTokens
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
      run: (k) => gemini(k, system, user, maxTokens),
    },
    {
      name: "mistral",
      env: "MISTRAL_API_KEY",
      run: (k) =>
        openAICompatible(
          "https://api.mistral.ai/v1/chat/completions",
          k,
          "mistral-small-latest",
          system,
          user,
          maxTokens
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
          system,
          user,
          maxTokens
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
      const text = await p.run(key);
      return { text, provider: p.name };
    } catch (e) {
      errorsLog[p.name] = e instanceof Error ? e.message : "Erreur réseau";
    }
  }

  throw new AllProvidersFailedError(errorsLog);
}
