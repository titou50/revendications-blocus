'use client';

import React, { useState } from 'react';
import { toPng } from 'html-to-image';
import type { Establishment } from '@/lib/types';

interface ExportStoryButtonProps {
  establishment: Establishment;
}

export function ExportStoryButton({ establishment }: ExportStoryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadStory = async () => {
    const storyElement = document.getElementById('insta-story-template');
    if (!storyElement) return;

    try {
      setDownloading(true);
      const dataUrl = await toPng(storyElement, {
        quality: 0.95,
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.download = `story_${establishment.code_uai || 'blocus'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Erreur lors de la génération PNG de la story :', error);
      alert('Erreur lors du téléchargement du visuel story.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      {/* Bouton d'ouverture */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white font-bold rounded-xl shadow-lg transition text-sm"
      >
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
        <span>Faire une Story</span>
      </button>

      {/* Modal d'aperçu */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Story Instagram</h3>
                <p className="text-xs text-zinc-400">
                  Télécharge l'image et ajoute le sticker lien sur Insta
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-white p-2 text-sm font-semibold rounded-lg hover:bg-zinc-800 transition"
              >
                Fermer ✕
              </button>
            </div>

            {/* Aperçu échelle réduite (Story 9:16) */}
            <div className="p-6 overflow-y-auto flex flex-col items-center gap-4">
              <div className="w-[240px] h-[426px] rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 relative bg-neutral-950 flex flex-col justify-between p-6 text-white text-center">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-red-500 tracking-wider uppercase block">
                    MOBILISATION INTER-LYCÉES
                  </span>
                  <p className="text-[11px] font-medium text-zinc-400">
                    Chaque établissement a sa page
                  </p>
                </div>

                <div className="space-y-3 my-auto">
                  <h3 className="text-lg font-black leading-tight uppercase">
                    FAIS ENTENDRE TES REVENDICATIONS !
                  </h3>
                  <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-xl">
                    <span className="text-[10px] text-zinc-400 block">Page actuelle :</span>
                    <span className="text-xs font-bold text-white block truncate">{establishment.name}</span>
                  </div>
                  <div className="mt-2 border-2 border-dashed border-red-500/50 bg-red-500/10 p-2 rounded-xl">
                    <span className="text-[10px] font-bold text-red-400 uppercase block">
                      📍 Coller le sticker lien ici
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-zinc-500 font-mono">
                  revendications-blocus.vercel.app
                </div>
              </div>

              <button
                onClick={handleDownloadStory}
                disabled={downloading}
                className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-orange-600 hover:opacity-90 text-white font-bold text-sm rounded-xl transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {downloading ? 'Génération PNG...' : 'Télécharger l\'image Story'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rendu masqué 1080x1920 (9:16) pour la capture HTML */}
      <div className="fixed top-[9999px] left-[9999px] pointer-events-none opacity-0">
        <div
          id="insta-story-template"
          style={{ width: '1080px', height: '1920px' }}
          className="bg-neutral-950 text-white p-20 flex flex-col justify-between font-sans relative overflow-hidden box-border select-none"
        >
          {/* Halos Lumineux */}
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-red-600/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-[600px] h-[600px] bg-orange-600/20 rounded-full blur-3xl" />

          {/* Header Story */}
          <div className="z-10 text-center space-y-3 pt-12">
            <span className="text-red-500 font-black tracking-widest text-3xl uppercase block">
              PLATFORM INTER-LYCÉES & ÉTUDIANTE
            </span>
            <p className="text-2xl text-neutral-400 font-medium">
              Collèges · Lycées · Universités de toute la France
            </p>
          </div>

          {/* Corps de Story avec clarification inter-lycées */}
          <div className="z-10 text-center space-y-8 my-auto px-8">
            <span className="inline-block px-8 py-3 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-2xl uppercase tracking-wider">
              TROUVE OU CRÉE TON ÉTABLISSEMENT
            </span>
            <h2 className="text-6xl font-black leading-tight tracking-tight text-white uppercase">
              FAIS ENTENDRE LES REVENDICATIONS DE TON LYCÉE !
            </h2>
            <p className="text-3xl text-neutral-300 font-medium max-w-2xl mx-auto leading-relaxed">
              Propose des idées, vote pour les priorités et génère les communiqués officiels de ton établissement.
            </p>

            {/* Encadré d'exemple / établissement courant */}
            <div className="bg-neutral-900/80 border border-neutral-800 p-6 rounded-2xl max-w-xl mx-auto">
              <span className="text-lg text-neutral-400 block uppercase font-bold tracking-wider">
                Focus Établissement :
              </span>
              <span className="text-3xl font-black text-white block mt-1">
                {establishment.name} ({establishment.city})
              </span>
            </div>

            {/* Zone indicative pour coller le lien Instagram */}
            <div className="pt-4">
              <div className="border-4 border-dashed border-red-500/60 bg-red-950/40 p-8 rounded-3xl max-w-xl mx-auto shadow-2xl">
                <span className="text-2xl font-black text-red-400 uppercase tracking-wide block">
                  🔗 AJOUTE LE STICKER LIEN ICI
                </span>
                <span className="text-lg text-neutral-400 block mt-1 font-mono">
                  revendications-blocus.vercel.app
                </span>
              </div>
            </div>
          </div>

          {/* Footer Story */}
          <div className="z-10 border-t border-neutral-800 pt-8 flex justify-between items-center text-neutral-400 text-2xl font-semibold pb-12">
            <span>Réseau National de Mobilisation</span>
            <span className="font-mono text-neutral-500">
              {establishment.type} · {establishment.city}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
