import React from 'react';

export function RulesBanner() {
  return (
    <div className="w-full max-w-4xl mx-auto my-6 p-4 md:p-5 bg-gradient-to-r from-red-950/80 via-zinc-900 to-orange-950/80 border border-red-500/40 rounded-2xl shadow-xl backdrop-blur-md">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        {/* Icône d'avertissement / Mégaphone */}
        <div className="p-3 bg-red-600/20 border border-red-500/30 rounded-xl text-red-400 shrink-0">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 000-6M5.436 13.683A4.001 4.001 0 017 6h1.832c.41 0 .824-.102 1.2-.3l1.826-1.012A2 2 0 0115 6.47V17.53a2 2 0 01-3.142 1.782l-1.826-1.012a2.001 2.001 0 00-1.2-.3H7c-.822 0-1.604-.325-2.183-.902 font-bold"
            />
          </svg>
        </div>

        {/* Texte du cadre */}
        <div className="space-y-1">
          <h3 className="text-sm md:text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Cadre des revendications</span>
            <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full lowercase font-normal">
              obligatoire
            </span>
          </h3>
          <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
            Toute publication doit être obligatoirement liée à{' '}
            <strong className="text-white font-semibold">l'Éducation nationale</strong>, aux{' '}
            <strong className="text-white font-semibold">conditions d'enseignement</strong> ou aux{' '}
            <strong className="text-white font-semibold">mouvements lycéens</strong> (moyens des établissements, Parcoursup, présence des forces de l'ordre, violences policières, etc.).
          </p>
        </div>
      </div>
    </div>
  );
}
