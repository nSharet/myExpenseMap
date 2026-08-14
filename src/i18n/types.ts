export const translationKeys = [
  "appTitle", "period", "localData", "manageClassifications", "language", "hebrew", "english",
  "allExpenses", "transactionDetails", "drillDown", "includedTransactions", "viewTotal", "shareOfTotal",
  "domains", "categories", "months", "sort", "sortAmount", "sortName", "transactions", "open", "openItem",
  "interactionHint", "recordsTitle", "recordsDescription", "searchPlaceholder", "date", "merchant",
  "classification", "card", "amount", "corrected", "changeClassification", "totalRecords", "close",
  "classificationEyebrow", "currentClassification", "recordAmount", "applyQuestion", "allMerchantRecords",
  "matchingRecords", "oneRecord", "noOtherImpact", "domain", "subcategory", "newDomain", "newSubcategory",
  "newDomainPlaceholder", "newSubcategoryPlaceholder", "cancel", "saveAndApply", "mappingRules", "rulesTitle",
  "rulesDescription", "noRules", "merchantScope", "recordScope", "remove", "exportJson", "updatedOne",
  "updatedMany", "ruleRemoved", "productTagline", "heroTitle", "heroDescription", "uploadData",
  "exploreDemo", "localOnlyBadge", "localOnlyTitle", "localOnlyDescription", "howItWorks",
  "stepUploadTitle", "stepUploadDescription", "stepNormalizeTitle", "stepNormalizeDescription",
  "stepExploreTitle", "stepExploreDescription", "supportedSources", "creditCard", "bankAccount",
  "financialReport", "uploadTitle", "uploadDescription", "dropFiles", "browseFiles", "supportedFormats",
  "selectedFiles", "removeFile", "processDemo", "invalidFileType", "fileTooLarge", "processingTitle",
  "processingDescription", "processingStageValidate", "processingStageNormalize", "processingStageCategorize",
  "processingReady", "openExplorer", "demoMode", "demoNotice", "backHome", "startOver",
  "viewMode", "listView", "pieChartView", "pieChartTitle", "pieSliceLabel",
] as const;

export type TranslationKey = typeof translationKeys[number];
export type TranslationMessages = Record<TranslationKey, string>;
export type Direction = "rtl" | "ltr";
export type MonthKey = "01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09" | "10" | "11" | "12";

export type LocaleDefinition<Code extends string = string> = {
  code: Code;
  displayName: string;
  locale: string;
  direction: Direction;
  messages: TranslationMessages;
  months: Record<MonthKey, string>;
  taxonomy: Record<string, string>;
};

export function defineLocale<const Code extends string>(definition: LocaleDefinition<Code>) {
  return definition;
}
