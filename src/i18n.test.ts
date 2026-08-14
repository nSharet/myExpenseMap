import { describe, expect, it } from "vitest";
import {
  createI18n,
  createI18nFromLocale,
  defineLocale,
  locales,
  supportedLanguages,
  translationKeys,
} from "./i18n";
import { enLocale } from "./i18n/locales/en";

describe("i18n", () => {
  it("switches writing direction", () => {
    expect(createI18n("he").direction).toBe("rtl");
    expect(createI18n("en").direction).toBe("ltr");
  });

  it("interpolates translated values", () => {
    expect(createI18n("en").t("includedTransactions", { count: 12 })).toContain("12");
  });

  it("localizes built-in taxonomy while preserving unknown labels", () => {
    expect(createI18n("en").labelTaxonomy("תחזוקת רכב")).toBe("Vehicle maintenance");
    expect(createI18n("en").labelTaxonomy("My custom category")).toBe("My custom category");
  });

  it("keeps every registered locale complete", () => {
    for (const language of supportedLanguages) {
      expect(Object.keys(locales[language].messages).sort()).toEqual([...translationKeys].sort());
      expect(Object.keys(locales[language].months)).toHaveLength(12);
    }
  });

  it("derives supported languages from the single registry", () => {
    expect(supportedLanguages).toEqual(["he", "en"]);
  });

  it("can construct an i18n instance for a future third-language module", () => {
    const frenchExample = defineLocale({
      ...enLocale,
      code: "fr",
      displayName: "Français",
      locale: "fr-FR",
      months: { ...enLocale.months, "01": "janvier" },
      taxonomy: { "תחזוקת רכב": "Entretien du véhicule" },
    });

    const french = createI18nFromLocale(frenchExample);
    expect(french.language).toBe("fr");
    expect(french.formatMonth("2026-01")).toBe("janvier 2026");
    expect(french.labelTaxonomy("תחזוקת רכב")).toBe("Entretien du véhicule");
  });
});
