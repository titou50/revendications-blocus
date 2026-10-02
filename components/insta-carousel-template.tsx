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

  return (
    <div
      id={`insta-slide-${slideIndex}`}
      style={{ width: '1080px', height: '1350px' }}
      className="bg-neutral-950 text-white p-16 flex flex-col justify-between font-sans relative overflow-hidden"
    >
      {/* Background Accent / Gradien Mobilisation */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-red-600/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-8 z-10">
        <div>
          <span className="text-red-500 font-bold tracking-wider text-xl uppercase">
            BLOCUS & MOBILISATION
          </span>
          <h2 className="text-3xl font-black text-neutral-100">{establishment.name}</h2>
          <p className="text-xl text-neutral-400">{establishment.city}</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-mono text-neutral-500">
            {slideIndex + 1}/{totalSlides}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="my-auto py-8 space-y-8 z-10">
        {isCover ? (
          <div className="space-y-6 text-center my-auto">
            <span className="inline-block px-6 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-semibold text-2xl">
              COMMUNIQUÉ OFFICIEL
            </span>
            <h1 className="text-6xl font-black leading-tight tracking-tight text-white">
              REVENDICATIONS & CAHIER DE DOLÉANCES
            </h1>
            <p className="text-3xl text-neutral-300 font-medium">
              {establishment.participant_count} participant(s) mobilisé(s)
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-red-400 uppercase tracking-wide">
              Nos Revendications ({claims.length})
            </h3>
            <div className="space-y-6">
              {claims.map((claim, idx) => (
                <div
                  key={claim.id || idx}
                  className="bg-neutral-900/80 border border-neutral-800 p-8 rounded-2xl space-y-3"
                >
                  <span className="inline-block text-sm font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-3 py-1 rounded">
                    {claim.category === 'national' ? 'National' : 'Local'}
                  </span>
                  <p className="text-3xl font-bold leading-snug text-neutral-100">
                    {claim.formatted_title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-800 pt-8 flex items-center justify-between text-neutral-400 z-10">
        <span className="text-xl font-semibold">Mobilisation Étudiante & Lycéenne</span>
        <span className="text-xl font-mono text-neutral-500">Généré en direct</span>
      </div>
    </div>
  );
}
