import { HomeForm } from "@/components/home-form";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-16">
      <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">
        Plateforme étudiante
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-instrument)] text-5xl leading-[0.95] sm:text-6xl">
        Le document de revendications de ton établissement.
      </h1>
      <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
        Trouve ton collège, lycée ou université. Lis le texte en direct, ajoute une
        idée (reformulée tout de suite), vote, puis copie le communiqué pour Insta
        ou Telegram.
      </p>

      {/* Cadre explicatif des règles de modération */}
      <div className="mt-8 p-4 bg-red-950/40 border border-red-500/30 rounded-xl text-left backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                Règle de publication
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Les revendications doivent obligatoirement concerner <strong className="text-white font-semibold">l'enseignement</strong>, <strong className="text-white font-semibold">l'Éducation nationale</strong> ou les <strong className="text-white font-semibold">mouvements lycéens/étudiants</strong> (moyens, Parcoursup, présence des forces de l'ordre, violences policières, etc...).
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <HomeForm />
      </div>
    </main>
  );
}
