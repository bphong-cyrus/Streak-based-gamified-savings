"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fmt } from "@/lib/format";
import { defaultLanguage, getLanguage, type Language, type Translate } from "@/lib/languages";
import catalogs from "@/lib/translations.json";

const storageKey = "savient-language";
const dictionaries: Record<Exclude<Language, "vi">, Record<string, string>> = catalogs;

function getSavedLanguage() {
  try {
    return getLanguage(localStorage.getItem(storageKey))?.code ?? defaultLanguage;
  } catch {
    return defaultLanguage;
  }
}

function languageTools(language: Language) {
  const details = getLanguage(language)!;
  const t: Translate = (source, values) => {
    const dictionary = language === defaultLanguage ? undefined : dictionaries[language];
    const message = dictionary && Object.hasOwn(dictionary, source) ? dictionary[source] : source;
    if (!values) return message;
    return message.replace(/\{(\d+)\}/g, (match, index) => {
      const value = values[Number(index)];
      return value === undefined ? match : String(value);
    });
  };

  return {
    language,
    locale: details.locale,
    direction: "rtl" in details ? "rtl" : "ltr",
    t,
    formatAmount: (amount: bigint | undefined, digits?: number) => fmt(amount, digits, details.locale),
  };
}

const LanguageContext = createContext({
  ...languageTools(defaultLanguage),
  setLanguage: (_language: Language) => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);

  useEffect(() => {
    setLanguageState(getSavedLanguage());
    function syncLanguage(event: StorageEvent) {
      if (event.key === storageKey || event.key === null) setLanguageState(getSavedLanguage());
    }
    window.addEventListener("storage", syncLanguage);
    return () => window.removeEventListener("storage", syncLanguage);
  }, []);

  const value = useMemo(() => ({
    ...languageTools(language),
    setLanguage: (next: Language) => {
      setLanguageState(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        // The current tab remains usable when storage is unavailable.
      }
    },
  }), [language]);

  useEffect(() => {
    document.documentElement.lang = value.locale;
    document.documentElement.dir = value.direction;
  }, [value]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
