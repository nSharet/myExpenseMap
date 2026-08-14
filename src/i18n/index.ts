import { locales, supportedLanguages, type Language } from "./locales";
import type { LocaleDefinition, TranslationKey } from "./types";

export type { Language } from "./locales";
export type { Direction, LocaleDefinition, TranslationKey, TranslationMessages } from "./types";
export { defineLocale, translationKeys } from "./types";
export { locales, supportedLanguages } from "./locales";

export function createI18nFromLocale<const Code extends string>(definition: LocaleDefinition<Code>) {
  const t = (key: TranslationKey, values: Record<string, string | number> = {}) =>
    Object.entries(values).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
      definition.messages[key],
    );

  return {
    language: definition.code,
    locale: definition.locale,
    direction: definition.direction,
    t,
    labelTaxonomy: (value: string) => definition.taxonomy[value] ?? value,
    formatMoney: (value: number) => new Intl.NumberFormat(definition.locale, { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(value),
    formatDate: (value: string) => new Intl.DateTimeFormat(definition.locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T12:00:00`)),
    formatInteger: (value: number) => new Intl.NumberFormat(definition.locale).format(value),
    formatPercent: (value: number) => new Intl.NumberFormat(definition.locale, { style: "percent", maximumFractionDigits: 1 }).format(value),
    formatMonth: (value: string) => {
      const [year, month] = value.split("-");
      return `${definition.months[month as keyof typeof definition.months] ?? month} ${year}`;
    },
  };
}

export function createI18n(language: Language) {
  return createI18nFromLocale(locales[language]);
}

export function isSupportedLanguage(value: string): value is Language {
  return supportedLanguages.includes(value as Language);
}

export function detectLanguage(): Language {
  const saved = localStorage.getItem("interactive-expense-explorer.language");
  if (saved && isSupportedLanguage(saved)) return saved;
  const browserLanguage = navigator.language.toLocaleLowerCase().split("-")[0];
  return isSupportedLanguage(browserLanguage) ? browserLanguage : "en";
}
