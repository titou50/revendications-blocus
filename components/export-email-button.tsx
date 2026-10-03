'use client';

import React, { useState } from 'react';
import type { Claim, Establishment } from '@/lib/types';

interface ExportEmailButtonProps {
  establishment: Establishment;
  claims: Claim[];
}

export function ExportEmailButton({ establishment, claims }: ExportEmailButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeClaims = claims.filter((c) => c.status !== 'archived');
  const nationalClaims = activeClaims.filter((c) => c.category === 'national');
  const localClaims = activeClaims.filter((c) => c.category === 'local');

  const subject = `Revendications et doléances des élèves du ${establishment.name}`;

  // Formate les revendications de manière naturelle (puces simples)
  const formatClaimsText = () => {
    let text = '';

    if (localClaims.length > 0) {
      text += `Au niveau de notre établissement :\n`;
      text += localClaims.map((c) => `- ${c.formatted_title || c.original_text}`).join('\n');
      text += '\n\n';
    }

    if (nationalClaims.length > 0) {
      text += `Au niveau national :\n`;
      text += nationalClaims.map((c) => `- ${c.formatted_title || c.original_text}`).join('\n');
    }

    return text.trim() || '- Aucune revendication spécifique enregistrée à ce jour.';
  };

  // Corps de mail rédigé naturellement
  const emailBody = `Madame, Monsieur,

Nous vous adressons ce message au nom des élèves mobilisés du ${establishment.name} (${establishment.city}) pour vous transmettre l'ensemble de nos revendications actuelles.

Face à la situation, nous demandons des réponses et des engagements clairs sur les points suivants :

${formatClaimsText()}

Sans prise en compte de ces demandes et sans ouverture d'un dialogue réel, le mouvement et les actions de blocage se poursuivront au sein de l'établissement.

Nous restons dans l'attente de votre retour.

Les élèves du ${establishment.name}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`Objet : ${subject}\n\n${emailBody}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur de copie :', err);
    }
  };

  const handleMailTo = () => {
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={activeClaims.length === 0}
        className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl shadow-lg border border-zinc-700/60 transition disabled:opacity-50 text-sm"
      >
        <svg className="w-5 h-5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <span>Envoyer aux Institutions</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header Modal */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">E-mail aux autorités</h3>
                <p className="text-xs text-zinc-400">Direction, académie ou rectorat</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-white p-2 text-sm font-semibold rounded-lg hover:bg-zinc-800 transition"
              >
                Fermer ✕
              </button>
            </div>

            {/* Corps du message */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Objet
                </label>
                <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-sm text-zinc-200 font-medium">
                  {subject}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Contenu
                </label>
                <textarea
                  readOnly
                  value={emailBody}
                  rows={12}
                  className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-sm text-zinc-300 font-mono leading-relaxed focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 border-t border-zinc-800 flex flex-col sm:flex-row gap-3 justify-end bg-zinc-950/40 rounded-b-2xl">
              <button
                onClick={handleCopy}
                className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs rounded-xl transition flex items-center justify-center gap-2 border border-zinc-700/50"
              >
                {copied ? (
                  <span className="text-green-400 font-bold">✓ Copié dans le presse-papier</span>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V8m0 0l3 3m-3-3l-3 3"
                      />
                    </svg>
                    <span>Copier le texte</span>
                  </>
                )}
              </button>

              <button
                onClick={handleMailTo}
                className="py-2.5 px-5 bg-gradient-to-r from-red-600 to-orange-600 hover:opacity-90 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
                <span>Ouvrir dans mon client Mail</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
