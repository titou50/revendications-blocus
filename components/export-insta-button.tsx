'use client';

import React, { useState } from 'react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { Claim, Establishment } from '@/lib/types';
import { InstaSlide } from './insta-carousel-template';

interface ExportInstaButtonProps {
  establishment: Establishment;
  claims: Claim[];
}

export function ExportInstaButton({ establishment, claims }: ExportInstaButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const CLAIMS_PER_SLIDE = 3;
  const activeClaims = claims.filter((c) => c.status !== 'archived');

  const claimChunks: Claim[][] = [];
  for (let i = 0; i < activeClaims.length; i += CLAIMS_PER_SLIDE) {
    claimChunks.push(activeClaims.slice(i, i + CLAIMS_PER_SLIDE));
  }

  const totalSlides = 1 + claimChunks.length;

  const handleShareInsta = async () => {
    setIsGenerating(true);
    try {
      const zip = new JSZip();

      for (let i = 0; i < totalSlides; i++) {
        const slideElement = document.getElementById(`insta-slide-${i}`);
        if (!slideElement) continue;

        const dataUrl = await toPng(slideElement, {
          quality: 0.95,
          pixelRatio: 2,
        });

        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        zip.file(`slide_${i + 1}.png`, base64Data, { base64: true });
      }

      // 1. Télécharger le fichier ZIP des visuels
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `carrousel-${establishment.code_uai || 'blocus'}.zip`);

      // 2. Tenter d'ouvrir l'application Instagram sur mobile
      setTimeout(() => {
        window.location.href = 'instagram://app';
      }, 1000);

    } catch (error) {
      console.error('Erreur lors du partage Instagram :', error);
      alert('Erreur lors de la préparation des images.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <button
        onClick={handleShareInsta}
        disabled={isGenerating || activeClaims.length === 0}
        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition disabled:opacity-50 text-sm"
      >
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
        {isGenerating ? 'Préparation...' : 'Partager sur Insta'}
      </button>

      {/* Rendu masqué hors-écran pour la capture */}
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
