import OpenAI from "openai";

const SYSTEM_PROMPT = `Tu es un assistant chargé de reformuler des revendications lycéennes/étudiantes pour un communiqué de blocus ou de grève.
Règles :
1. Reformule la saisie sous forme d'une revendication claire, synthétique et percutante (15 mots maximum).
2. Utilise un style direct (ex: "Réparation immédiate du système de chauffage du bâtiment B").
3. Si la saisie contient des insultes ciblées, des noms propres d'individus, du harcèlement ou du contenu inapproprié, réponds STRICTEMENT le mot REJECTED (sans guillemets ni ponctuation).`;

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
  const trimmed = originalText.trim();

  // 1. Validation de la longueur
  if (trimmed.length < 8) {
    throw new Error("La revendication doit contenir au moins 8 caractères.");
  }
  if (trimmed.length > 500) {
    throw new Error("La revendication dépasse la limite autorisée de 500 caractères.");
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return localFormat(trimmed);
  }

  try {
    const groq = new OpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: key,
    });

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: trimmed },
      ],
      temperature: 0.2,
      max_tokens: 80,
    });

    const formatted = response.choices[0]?.message?.content?.trim() || "";

    // Fix Faille Claude : Normalisation flexible pour détecter 'REJECTED' sous toutes ses formes
    if (formatted.toUpperCase().replace(/[^A-Z]/g, "").includes("REJECTED")) {
      throw new Error("REJECTED");
    }

    if (!formatted) {
      return localFormat(trimmed);
    }

    return formatted;
  } catch (error: any) {
    if (error?.message === "REJECTED") {
      throw new Error("Contenu inapproprié ou non conforme aux règles de modération.");
    }
    console.error("Erreur lors de la reformulation Groq :", error);
    // En cas de panne API, fallback local propre
    return localFormat(trimmed);
  }
}
