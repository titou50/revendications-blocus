"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { EstablishmentSearchHit } from "@/lib/types";

const NAME_KEY = "rv_name";

const fieldClass =
  "h-10 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function HomeForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<EstablishmentSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(NAME_KEY) ?? "null");
      if (saved?.firstName) setFirstName(saved.firstName);
      if (saved?.lastName) setLastName(saved.lastName);
    } catch {
      /* ignore */
    }
  }, []);

  const canSearch = city.trim().length >= 2 || query.trim().length >= 2;

  useEffect(() => {
    if (!canSearch) {
      setHits([]);
      return;
    }
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (city.trim()) params.set("city", city.trim());
        const res = await fetch(`/api/establishments?${params}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur");
        setHits(data.results ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Recherche impossible");
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [city, query, canSearch]);

  const ready = useMemo(
    () => firstName.trim().length >= 1 && lastName.trim().length >= 1,
    [firstName, lastName]
  );

  async function openEstablishment(hit: EstablishmentSearchHit) {
    if (!ready) {
      setError("Indique ton nom et prénom pour continuer.");
      return;
    }
    setSubmitting(hit.code_uai);
    setError(null);
    localStorage.setItem(
      NAME_KEY,
      JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() })
    );
    try {
      const res = await fetch("/api/establishments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hit),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Impossible d’ouvrir le document");
      router.push(`/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setSubmitting(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="firstName">Prénom</Label>
          <input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Léa"
            className={cn(fieldClass)}
            autoComplete="given-name"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="lastName">Nom</Label>
          <input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Martin"
            className={cn(fieldClass)}
            autoComplete="family-name"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="city">Ville</Label>
          <input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Lyon, Rennes…"
            className={cn(fieldClass)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="school">Établissement</Label>
          <input
            id="school"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom du collège, lycée, univ."
            className={cn(fieldClass)}
          />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {loading ? "Recherche…" : hits.length ? `${hits.length} résultat(s)` : "Autocomplétion Open Data"}
        </div>
        <ul className="max-h-80 divide-y overflow-auto">
          {hits.map((hit) => (
            <li key={hit.code_uai}>
              <button
                type="button"
                disabled={Boolean(submitting)}
                onClick={() => openEstablishment(hit)}
                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-accent/60 disabled:opacity-60"
              >
                <span>
                  <span className="block font-medium">{hit.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {hit.city} · {hit.type} · {hit.code_uai}
                  </span>
                </span>
                <span className="text-xs text-primary">
                  {submitting === hit.code_uai ? "Ouverture…" : "Ouvrir"}
                </span>
              </button>
            </li>
          ))}
          {!loading && canSearch && hits.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              Aucun établissement trouvé. Essaie un nom plus court ou une autre ville.
            </li>
          ) : null}
          {!canSearch ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              Tape une ville ou un nom d’établissement (annuaire Éducation nationale).
            </li>
          ) : null}
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">
        Le nom sert uniquement d’affichage local. Les votes sont anonymes (cookie de session).
      </p>
    </div>
  );
}
