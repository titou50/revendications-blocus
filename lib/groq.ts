import OpenAI from "openai";

const SYSTEM_PROMPT = `Tu es un assistant chargé de reformuler des revendications lycéennes/étudiantes pour un communiqué de blocus ou de grève.
Règles :
1. Reformule la saisie sous forme d'une revendication claire, synthétique et percutante (15 mots maximum).
2. Utilise un style direct (ex: "Réparation immédiate du système de chauffage du bâtiment B").
3. Si la saisie contient des insultes ciblées, du harcèlement nominatif ou du contenu inapproprié, réponds uniquement : 'REJECTED'.`;

function localFormat(text: string): string {
  const words = text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 15);
  const line = words.join(" ");
  return line.charAt(0).toUpperCase() + line.slice(1);
}

export async function formatClaim(originalText: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return localFormat(originalText);
  }

  const groq = new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: key,
  });

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: originalText },
    ],
    temperature: 0.2,
    max_tokens: 80,
  });

  const formatted = response.choices[0]?.message?.content?.trim();
  if (!formatted) {
    return localFormat(originalText);
  }
  return formatted;
}
