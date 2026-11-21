export const languages = [
  { code: "vi", name: "Tiếng Việt", locale: "vi-VN" },
  { code: "en", name: "English", locale: "en" },
  { code: "zh", name: "简体中文", locale: "zh-Hans" },
  { code: "hi", name: "हिन्दी", locale: "hi" },
  { code: "es", name: "Español", locale: "es" },
  { code: "ar", name: "العربية", locale: "ar", rtl: true },
  { code: "fr", name: "Français", locale: "fr" },
  { code: "bn", name: "বাংলা", locale: "bn" },
  { code: "pt", name: "Português", locale: "pt" },
  { code: "id", name: "Bahasa Indonesia", locale: "id" },
  { code: "ur", name: "اردو", locale: "ur", rtl: true },
] as const;

export type Language = (typeof languages)[number]["code"];
export type Translate = (source: string, values?: readonly unknown[]) => string;

export const defaultLanguage = "vi";

export function getLanguage(code: string | null) {
  return languages.find((language) => language.code === code);
}
