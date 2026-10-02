export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="font-[family-name:var(--font-instrument)] text-4xl">
        Document introuvable
      </h1>
      <p className="mt-3 text-muted-foreground">
        Cet établissement n’est pas encore ouvert sur la plateforme. Repars de
        l’accueil pour le rechercher.
      </p>
      <a href="/" className="mt-6 inline-block text-primary underline">
        Retour
      </a>
    </main>
  );
}
