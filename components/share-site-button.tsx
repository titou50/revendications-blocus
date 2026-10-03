'use client';

import React, { useState } from 'react';

export function ShareSiteButton() {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareData = {
      title: 'Mobilisation & Revendications Lycéennes',
      text: "Viens faire entendre tes revendications et voter pour le document de ton établissement !",
      url: window.location.href,
    };

    // Utilise le partage natif mobile si disponible
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // En cas d'annulation ou d'erreur, fallback sur la copie
      }
    }

    // Fallback : Copie du lien
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur de copie :', err);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold rounded-xl shadow-lg border border-zinc-800 transition text-sm"
    >
      {copied ? (
        <span className="text-green-400 font-bold">✓ Lien copié !</span>
      ) : (
        <>
          <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 10-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 10-5.368-2.684z"
            />
          </svg>
          <span>Partager la page</span>
        </>
      )}
    </button>
  );
}
