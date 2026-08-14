# Adding a language

All language resources live in `src/i18n`. To add a third language, create its locale module and register it once.

For example, to add French:

1. Create `src/i18n/taxonomy/fr.ts` with translations for the built-in stored taxonomy.
2. Create `src/i18n/locales/fr.ts`:

```ts
import { defineLocale, type TranslationMessages } from "../types";
import { frTaxonomy } from "../taxonomy/fr";

const messages = {
  // Every key required by TranslationMessages.
} satisfies TranslationMessages;

export const frLocale = defineLocale({
  code: "fr",
  displayName: "Français",
  locale: "fr-FR",
  direction: "ltr",
  messages,
  months: {
    "01": "janvier",
    // Continue through "12".
  },
  taxonomy: frTaxonomy,
});
```

3. Register it in `src/i18n/locales/index.ts`:

```ts
import { frLocale } from "./fr";

export const locales = {
  he: heLocale,
  en: enLocale,
  fr: frLocale,
} as const;
```

The `Language` union and supported-language list are derived from this registry automatically. TypeScript reports missing interface translations or month names during `npm run build`.

4. Run `npm test` and `npm run build`.

The language picker is generated from the registry, so no UI component changes are required.

User-created domains and categories need no translation entry; the application falls back to their stored label.
