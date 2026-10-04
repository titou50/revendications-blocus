'use client';

import React from 'react';
import type { Claim, Establishment } from '@/lib/types';

interface InstaCarouselTemplateProps {
  establishment: Establishment;
  claims: Claim[];
  slideIndex: number;
  totalSlides: number;
}

export function InstaSlide({
  establishment,
  claims,
  slideIndex,
  totalSlides,
}: InstaCarouselTemplateProps) {
  const isCover = slideIndex === 0;
  const isCTA = slideIndex === totalSlides - 1 && totalSlides > 1;

  return (
    <div
      id={`insta-slide-${slideIndex}`}
      style={{ width: '1080px', height: '1080px', minWidth: '1080px', minHeight: '1080px' }}
      className="bg-neutral-950 text-white p-12 flex flex-col justify-between font-sans relative overflow-hidden box-border shrink-0 select-none"
    >
      {/* Background Halo */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-600/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-orange-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-6 z-10">
        <div className="max-w-[800px]">
          <span className="text-red-500 font-extrabold tracking-wider text-lg uppercase block mb-1">
            BLOCUS & MOBILISATION
          </span>
          <h2 className="text-3xl font-black text-neutral-100 truncate">{establishment.name}</h2>
          <p className="text-lg text-neutral-400 font-medium">{establishment.city}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xl font-bold font-mono text-neutral-400 bg-neutral-900 px-4 py-2 rounded-xl border border-neutral-800">
            {slideIndex + 1}/{totalSlides}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="my-auto py-6 z-10 w-full">
        {isCover ? (
          /* SLIDE 1 : COVER */
          <div className="space-y-6 text-left my-auto">
            <span className="inline-block px-5 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-lg uppercase tracking-wide">
              COMMUNIQUÉ OFFICIEL
            </span>
            <h1 className="text-5xl font-black leading-tight tracking-tight text-white uppercase">
              REVENDICATIONS &<br />
              CAHIER DE DOLÉANCES
            </h1>
          </div>
        ) : isCTA ? (
          /* SLIDE FINALE : CALL TO ACTION / PUB SITE */
          <div className="space-y-8 text-center my-auto flex flex-col items-center justify-center">
            <span className="inline-block px-5 py-2 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold text-lg uppercase tracking-wide">
              REJOINS LA MOBILISATION
            </span>
            <h2 className="text-5xl font-black leading-tight tracking-tight text-white uppercase max-w-2xl">
              VIENS FAIRE ENTENDRE TES REVENDICATIONS !
            </h2>
            <p className="text-2xl text-neutral-400 max-w-xl font-medium">
              Ajoute tes idées, vote pour celles de ton lycée et suis l'avancement du mouvement en direct.
            </p>

            <div className="pt-4">
              <div className="bg-gradient-to-r from-red-600 to-orange-600 p-1 rounded-2xl shadow-xl">
                <div className="bg-neutral-950 px-8 py-4 rounded-[14px]">
                  <span className="text-2xl font-black text-white font-mono tracking-wide">
                    revendications-blocus.vercel.app
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* SLIDES INTERMÉDIAIRES : REVENDICATIONS */
          <div className="space-y-5 w-full">
            <h3 className="text-xl font-bold text-red-400 uppercase tracking-wide">
              REVENDICATIONS ({claims.length})
            </h3>
            <div className="space-y-4 w-full">
              {claims.map((claim, idx) => (
                <div
                  key={claim.id || idx}
                  className="bg-neutral-900/90 border border-neutral-800 p-6 rounded-2xl space-y-2 shadow-md w-full box-border"
                >
                  <span className="inline-block text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded">
                    {claim.category === 'national' ? 'NATIONAL' : 'LOCAL'}
                  </span>
                  <p className="text-2xl font-bold leading-snug text-neutral-100 break-words">
                    {claim.formatted_title || claim.original_text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-800 pt-6 flex items-center justify-between text-neutral-400 z-10">
        <span className="text-lg font-semibold">Mobilisation Étudiante & Lycéenne</span>
        {establishment.code_uai && (
          <span className="text-lg font-mono text-neutral-500">{establishment.code_uai}</span>
        )}
      </div>
    </div>
  );
}
