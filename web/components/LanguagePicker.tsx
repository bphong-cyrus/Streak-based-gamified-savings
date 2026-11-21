"use client";

import { getLanguage, languages } from "@/lib/languages";
import { useLanguage } from "@/components/LanguageProvider";

export function LanguagePicker() {
  const { language, t, setLanguage } = useLanguage();
  const label = t("Ngôn ngữ");
  const name = getLanguage(language)!.name;

  return (
    <label className="relative inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 text-xs font-bold text-ink focus-within:outline focus-within:outline-2 focus-within:outline-cta">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="pointer-events-none h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18" />
      </svg>
      <span aria-hidden="true" className="uppercase xl:hidden">{language}</span>
      <span aria-hidden="true" className="hidden xl:inline" dir="auto">{name}</span>
      <select
        data-testid="language-picker"
        aria-label={label}
        title={label}
        value={language}
        onChange={(event) => {
          const selected = getLanguage(event.target.value);
          if (selected) setLanguage(selected.code);
        }}
        className="h-11 w-[4.5rem] appearance-none rounded-full bg-transparent pe-2 ps-8 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-cta md:w-auto md:max-w-[12rem]"
      >
        {languages.map(({ code, locale, name }) => (
          <option key={code} value={code} lang={locale} dir="auto">{name}</option>
        ))}
      </select>
    </label>
  );
}
