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

  // Construction de l'objet
  const subject = `[MOBILISATION] Revendications et doléances des élèves - ${establishment.name}`;

  // Formatting des listes de revendications
  const formatList = (list: Claim[]) =>
    list.length > 0
      ? list.map((c) => `• ${c.formatted_title || c.original_text}`).join('\n')
      : '• Aucune revendication spécifique enregistrée à ce jour.';

  // Modèle d'e-mail institutionnel
  const emailBody = `À l'attention de la Direction de l'établissement, du Rectorat et des autorités académiques,

Au nom des élèves et de la communauté étudiante de l'établissement ${establishment.name} (${establishment.city}), nous vous transmettons officiellement le cahier de doléances adopté par les personnes mobilisées.

Afin de garantir des conditions d'étude denses, dignes et justes, nous demandons des engagements fermes et immédiats sur les points suivants :

-- REVENDICATIONS NATIONALES --
${formatList(nationalClaims)}

-- REVENDICATIONS LOCALES --
${formatList(localClaims)}

Sans réponse concrète de votre part ni ouverture d'un dialogue constructif, les actions de mobilisation et les mouvements de blocage seront reconduits.

Dans l'attente de vos retours rapides,

Cordialement,
Les élèves mobilisés de ${establishment.name}`;

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
      {/* Bouton principal */}
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
        <span>Envoyer aux autorités</span>
      </button>

      {/* Modal d'aperçu et d'envoi */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header Modal */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Communiqué Officiel par E-mail</h3>
                <p className="text-xs text-zinc-400">Prêt à être envoyé au Rectorat ou à la Direction</p>
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
                  Objet du message
                </label>
                <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-sm text-zinc-200 font-medium">
                  {subject}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Contenu de l'e-mail
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
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
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
