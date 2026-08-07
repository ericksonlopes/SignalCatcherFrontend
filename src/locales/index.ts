import { pt, TranslationKeys } from './pt';
import { en } from './en';
import { LanguageMode } from '../types';

export const translations = {
  pt,
  en,
};

export function getTranslation(lang: LanguageMode = 'pt') {
  const currentLocale = translations[lang] || translations.pt;

  return {
    t: (key: TranslationKeys): string => {
      return currentLocale[key] || translations.pt[key] || key;
    },
    lang,
  };
}
