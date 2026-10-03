'use client';

import React, { useState } from 'react';
import { toPng } from 'html-to-image';
import type { Claim, Establishment } from '@/lib/types';
import { InstaSlide } from './insta-carousel-template';

interface ExportInstaButtonProps {
  establishment: Establishment;
  claims: Claim[];
}

export function ExportInstaButton({ establishment, claims }: ExportInstaButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

  const CLAIMS_PER_SLIDE = 3;
  const activeClaims = claims.filter((c) => c.status !== 'archived');

  const claimChunks: Claim[][] = [];
  for (let i = 0; i < activeClaims.length; i += CLAIMS_PER_SLIDE) {
    claimChunks.push(activeClaims.slice(i, i + CLAIMS_PER_SLIDE));
  }

  const totalSlides = 1 + claimChunks.length;

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
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-white p-2 text-sm font-semibold rounded-lg hover:bg-zinc-800 transition"
              >
                Fermer ✕
              </button>
            </div>

            {/* Grille des visuels */}
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
                      claims={idx === 0 ? [] : claimChunks[idx - 1]}
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
          </div>
        </div>
      )}

      {/* Rendu masqué hors-écran garanti pour la capture via ID */}
      <div className="fixed top-[9999px] left-[9999px] pointer-events-none opacity-0">
        <InstaSlide
          establishment={establishment}
          claims={[]}
          slideIndex={0}
          totalSlides={totalSlides}
        />
        {claimChunks.map((chunk, idx) => (
          <InstaSlide
            key={idx}
            establishment={establishment}
            claims={chunk}
            slideIndex={idx + 1}
            totalSlides={totalSlides}
          />
        ))}
      </div>
    </>
  );
}
