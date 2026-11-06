import React from 'react';
import type { TranslationKeys } from '../../../locales/pt';

export function DiarizationError({ message, t }: {
  readonly message?: string | null;
  readonly t: (key: TranslationKeys) => string;
}) {
  return (
    <details open className="mt-3 min-w-0 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">
      <summary className="cursor-pointer font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400">
        {t('diarizationErrorDetails')}
      </summary>
      <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed [overflow-wrap:anywhere]">
        {message?.trim() ? message : t('diarizationErrorUnavailable')}
      </pre>
    </details>
  );
}
