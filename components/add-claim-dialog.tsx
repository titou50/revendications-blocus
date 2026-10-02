"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Claim, ClaimCategory } from "@/lib/types";

export function AddClaimDialog({
  establishmentId,
  onCreated,
}: {
  establishmentId: string;
  onCreated: (claim: Claim) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<ClaimCategory>("local");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooShort = text.trim().length < 8;

  async function submit() {
    // Verrou immédiat contre les doubles requêtes
    if (busy || tooShort) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText: text,
          category,
          establishmentId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ajout refusé");

      onCreated(data.claim);
      setText("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const hint = useMemo(
    () =>
      category === "local"
        ? "Chauffage, internat, cantine, emplois du temps…"
        : "Bac, Parcoursup, bourses, conditions nationales…",
    [category]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" />}>Ajouter une revendication</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-instrument)] text-2xl">
            Nouvelle idée
          </DialogTitle>
          <DialogDescription>
            Écris librement. L’IA en fait une phrase courte pour le communiqué.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={category === "local" ? "default" : "outline"}
              onClick={() => setCategory("local")}
            >
              Locale
            </Button>
            <Button
              type="button"
              variant={category === "national" ? "default" : "outline"}
              onClick={() => setCategory("national")}
            >
              Nationale
            </Button>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="claim">Texte brut</Label>
            <Textarea
              id="claim"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={hint}
              className="min-h-28 bg-card"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" disabled={busy || tooShort} onClick={submit}>
            {busy ? "Reformulation…" : "Publier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
