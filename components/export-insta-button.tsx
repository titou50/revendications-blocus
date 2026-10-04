'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import type { Claim, Establishment } from '@/lib/types';
import { InstaSlide } from './insta-carousel-template';

interface ExportInstaButtonProps {
  establishment: Establishment;
  claims: Claim[];
}

const CLEAN_BATCH_SIZE = 40;

// Corrige / filtre un lot de revendications via l'IA.
// En cas d'échec, on garde les textes d'origine pour ne jamais bloquer la génération.
async function cleanBatch(batch: Claim[]): Promise<{ claims: Claim[]; failed: boolean }> {
  try {
    const res = await fetch('/api/claims/clean-claims', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claims: batch.map((c) => ({ id: c.id, text: c.formatted_title || c.original_text })),
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = (await res.json()) as { claims?: { id: string; text: string }[] };
    if (!Array.isArray(data.claims)) throw new Error('Réponse invalide');

    const cleanedById = new Map(data.claims.map((c) => [c.id, c.text]));
    const kept = batch
      .filter((c) => cleanedById.has(c.id))
      .map((c) => ({ ...c, formatted_title: cleanedById.get(c.id)! }));

    return { claims: kept, failed: false };
  } catch (error) {
    console.error('Correction IA des revendications indisponible :', error);
    return { claims: batch, failed: true };
  }
}

export function ExportInstaButton({ establishment, claims }: ExportInstaButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

  const CLAIMS_PER_SLIDE = 3;
  const activeClaims = useMemo(() => claims.filter((c) => c.status !== 'archived'), [claims]);

  // Résultat de la correction IA, associé à la "signature" des textes pour savoir s'il est à jour
  const [cleaned, setCleaned] = useState<{
    signature: string;
    claims: Claim[];
    failed: boolean;
  } | null>(null);
  const inFlight = useRef<string | null>(null);

  const signature = useMemo(
    () => activeClaims.map((c) => `${c.id}:${c.formatted_title || c.original_text}`).join('|'),
    [activeClaims]
  );

  // Correction automatique à l'ouverture (et si les textes changent)
  useEffect(() => {
    if (!isOpen || activeClaims.length === 0) return;
    if (cleaned?.signature === signature || inFlight.current === signature) return;

    const sig = signature;
    inFlight.current = sig;

    (async () => {
      const batches: Claim[][] = [];
      for (let i = 0; i < activeClaims.length; i += CLEAN_BATCH_SIZE) {
        batches.push(activeClaims.slice(i, i + CLEAN_BATCH_SIZE));
      }
      const results = await Promise.all(batches.map(cleanBatch));
      setCleaned({
        signature: sig,
        claims: results.flatMap((r) => r.claims),
        failed: results.some((r) => r.failed),
      });
      if (inFlight.current === sig) inFlight.current = null;
    })();
  }, [isOpen, signature, activeClaims, cleaned]);

  const displayClaims: Claim[] | null =
    cleaned && cleaned.signature === signature ? cleaned.claims : null;
  const isCleaning = isOpen && activeClaims.length > 0 && displayClaims === null;

  const claimChunks: Claim[][] = [];
  const slidesClaims = displayClaims ?? [];
  for (let i = 0; i < slidesClaims.length; i += CLAIMS_PER_SLIDE) {
    claimChunks.push(slidesClaims.slice(i, i + CLAIMS_PER_SLIDE));
  }

  // Cover (1) + Chunks de revendications + Slide CTA finale (1)
  const totalSlides = 2 + claimChunks.length;

  const handleDownloadSlide = async (slideIndex: number) => {
    const slideElement = document.getElementById(`insta-slide-${slideIndex}`);
    if (!slideElement) return;

    try {
      setDownloadingIndex(slideIndex);
      const dataUrl = await toPng(slideElement, {
        quality: 0.95,
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.download = `slide_${slideIndex + 1}_${establishment.code_uai || 'blocus'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Erreur lors de la génération PNG :', error);
      alert('Erreur lors du téléchargement de la slide.');
    } finally {
      setDownloadingIndex(null);
    }
  };

  // Helper pour attribuer les bonnes revendications à chaque slide
  const getClaimsForSlide = (idx: number) => {
    if (idx === 0 || idx === totalSlides - 1) return [];
    return claimChunks[idx - 1] || [];
  };

  return (
    <>
      {/* Bouton d'ouverture */}
      <button
        onClick={() => setIsOpen(true)}
        disabled={activeClaims.length === 0}
        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition disabled:opacity-50 text-sm"
      >
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
        <span>Générer visuels Insta</span>
      </button>

      {/* Modal de sélection / Téléchargement individuel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header Modal */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Visuels Instagram</h3>
                <p className="text-xs text-zinc-400">Télécharge chaque slide en PNG direct</p>
                {cleaned?.signature === signature && cleaned.failed && (
                  <p className="text-xs text-amber-400 mt-1">
                    Correction IA indisponible : textes d&apos;origine utilisés.
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-white p-2 text-sm font-semibold rounded-lg hover:bg-zinc-800 transition"
              >
                Fermer ✕
              </button>
            </div>

            {/* Correction IA en cours */}
            {isCleaning && (
              <div className="p-10 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-8 h-8 border-2 border-zinc-700 border-t-pink-500 rounded-full animate-spin" />
                <p className="text-sm font-semibold text-white">Correction des revendications...</p>
                <p className="text-xs text-zinc-400">
                  Orthographe, niveau de langage et suppression des idées hors sujet
                </p>
              </div>
            )}

            {/* Grille des visuels */}
            {!isCleaning && (
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: totalSlides }).map((_, idx) => (
                <div key={idx} className="flex flex-col items-center gap-3 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/80">
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Slide {idx + 1} / {totalSlides}
                  </div>

                  {/* Aperçu direct de la slide */}
                  <div className="w-full aspect-square scale-90 origin-top rounded-lg overflow-hidden flex items-center justify-center">
                    <InstaSlide
                      establishment={establishment}
                      claims={getClaimsForSlide(idx)}
                      slideIndex={idx}
                      totalSlides={totalSlides}
                    />
                  </div>

                  {/* Action PNG */}
                  <button
                    onClick={() => handleDownloadSlide(idx)}
                    disabled={downloadingIndex === idx}
                    className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs rounded-lg transition flex items-center justify-center gap-2 border border-zinc-700/50 disabled:opacity-50"
                  >
                    {downloadingIndex === idx ? (
                      <span>Téléchargement...</span>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Télécharger PNG</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>
      )}

      {/* Rendu masqué hors-écran pour la capture via ID */}
      <div className="fixed top-[9999px] left-[9999px] pointer-events-none opacity-0">
        {/* Cover (Slide 0) */}
        <InstaSlide
          establishment={establishment}
          claims={[]}
          slideIndex={0}
          totalSlides={totalSlides}
        />
        {/* Revendications (Slides 1 à n-2) */}
        {claimChunks.map((chunk, idx) => (
          <InstaSlide
            key={idx}
            establishment={establishment}
            claims={chunk}
            slideIndex={idx + 1}
            totalSlides={totalSlides}
          />
        ))}
        {/* Call to Action (Slide n-1) */}
        <InstaSlide
          establishment={establishment}
          claims={[]}
          slideIndex={totalSlides - 1}
          totalSlides={totalSlides}
        />
      </div>
    </>
  );
}
