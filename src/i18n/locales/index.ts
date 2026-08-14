import { enLocale } from "./en";
import { heLocale } from "./he";

// Register a new language in this single registry after adding its locale module.
export const locales = {
  he: heLocale,
  en: enLocale,
} as const;

export type Language = keyof typeof locales;
export const supportedLanguages = Object.keys(locales) as Language[];
