import { pt, TranslationKeys } from './pt';
import { en } from './en';
import { LanguageMode } from '../types';

const translations = {
  en,
  pt,
};

export function getTranslation(lang: string = 'en') {
  const selectedLang: LanguageMode = lang === 'pt' ? 'pt' : 'en';
  const currentLocale = translations[selectedLang] || translations.en;

  return {
    t: (key: TranslationKeys): string => {
      return currentLocale[key] || translations.en[key] || key;
    },
    lang: selectedLang,
  };
}
