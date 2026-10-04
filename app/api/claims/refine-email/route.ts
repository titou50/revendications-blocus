import { NextRequest, NextResponse } from "next/server";
import { AllProvidersFailedError, generateWithFallback, stripMarkdown } from "@/lib/ai-providers";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { rawText, tone = "formel" } = await req.json();

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json({ error: "Le texte à corriger est vide." }, { status: 400 });
    }

    const systemPrompt = `Tu reçois un e-mail contenant une liste de revendications d'élèves ou d'étudiants.
Ta seule tâche : réécrire chaque revendication de la liste. Tout le reste de l'e-mail (objet, formule d'appel, introduction, conclusion, signature, saluts, sauts de ligne, ponctuation hors revendications) doit être recopié MOT POUR MOT, sans le moindre changement.

Pour chaque revendication : corrige l'orthographe, la grammaire et la ponctuation, et reformule-la dans un langage ${tone === "formel" ? "soutenu et respectueux (direction d'établissement, rectorat)" : "engagé et accessible"}, clair et percutant. Conserve son sens, sans rien inventer. Supprime toute revendication farfelue, sans rapport avec le mouvement (conditions d'études, vie de l'établissement, éducation) ou totalement dénuée de sens.

Le style doit sonner naturel et humain, comme écrit par un élève ou un étudiant sincère : évite les formules génériques et les tournures typiques d'une IA (« il est essentiel de », « il est primordial de », « n'hésitez pas à »), les mots pompeux et les tirets longs.

Conserve les marqueurs de liste (numéros, tirets) et la structure d'origine. Réponds uniquement avec l'e-mail complet, sans commentaire ni introduction, en texte brut : n'ajoute aucun Markdown (pas de ** ni de #).`;

    try {
      const { text, provider } = await generateWithFallback({
        system: systemPrompt,
        user: rawText,
        maxTokens: 2048,
      });
      return NextResponse.json({ refinedText: stripMarkdown(text), provider });
    } catch (e) {
      if (e instanceof AllProvidersFailedError) {
        console.error("Tous les providers IA ont échoué :", JSON.stringify(e.details));
        return NextResponse.json(
          { error: "Échec de tous les providers IA.", details: e.details },
          { status: 500 }
        );
      }
      throw e;
    }
  } catch (error) {
    console.error("Erreur serveur POST /api/claims/refine-email :", error);
    return NextResponse.json({ error: "Erreur interne serveur." }, { status: 500 });
  }
}
