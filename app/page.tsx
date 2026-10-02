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
      <div className="mt-10">
        <HomeForm />
      </div>
    </main>
  );
}
