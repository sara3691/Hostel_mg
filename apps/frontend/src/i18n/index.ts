import { useState, useEffect } from 'react';
import { en } from './en';
import { ta } from './ta';
import { hi } from './hi';

export type Language = 'en' | 'ta' | 'hi';

export const languages: { code: Language; name: string; nativeName: string; flag: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' }
];

const translations: Record<Language, any> = { en, ta, hi };
const STORAGE_KEY = 'smarthostel_lang';

export function getStoredLanguage(): Language {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'en' || saved === 'ta' || saved === 'hi') return saved;
  return 'en';
}

export function setStoredLanguage(lang: Language) {
  localStorage.setItem(STORAGE_KEY, lang);
  window.dispatchEvent(new CustomEvent('smarthostel_lang_change', { detail: lang }));
}

export function translate(lang: Language, key: string, params?: Record<string, string | number>): string {
  const parts = key.split('.');
  let obj: any = translations[lang] || translations.en;
  let found = true;

  for (const part of parts) {
    if (obj && typeof obj === 'object' && part in obj) {
      obj = obj[part];
    } else {
      found = false;
      break;
    }
  }

  // Fallback to English if missing in current language
  if (!found || typeof obj !== 'string') {
    let fallback: any = translations.en;
    let fallbackFound = true;
    for (const p of parts) {
      if (fallback && typeof fallback === 'object' && p in fallback) {
        fallback = fallback[p];
      } else {
        fallbackFound = false;
        break;
      }
    }
    if (fallbackFound && typeof fallback === 'string') {
      obj = fallback;
    } else {
      if (import.meta.env.DEV) {
        console.warn(`[i18n] Missing translation key: "${key}" for language "${lang}"`);
      }
      return key;
    }
  }

  let result = obj;
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
    });
  }
  return result;
}

export function useTranslation() {
  const [lang, setLangState] = useState<Language>(getStoredLanguage);

  useEffect(() => {
    const handleLangChange = (e: any) => {
      if (e.detail && (e.detail === 'en' || e.detail === 'ta' || e.detail === 'hi')) {
        setLangState(e.detail);
      }
    };
    window.addEventListener('smarthostel_lang_change', handleLangChange);
    return () => window.removeEventListener('smarthostel_lang_change', handleLangChange);
  }, []);

  const changeLanguage = (newLang: Language) => {
    setStoredLanguage(newLang);
    setLangState(newLang);
  };

  const t = (key: string, params?: Record<string, string | number>) => translate(lang, key, params);

  return { t, lang, changeLanguage, languages };
}
