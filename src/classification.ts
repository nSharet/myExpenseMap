import type { ClassificationRule, EffectiveExpense, ExpenseRecord } from "./types";

export function normalizeMerchant(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("he")
    .replace(/[\u200e\u200f]/g, "")
    .replace(/בע[״\"]?מ/g, "בעמ")
    .replace(/["'׳״.,/\\()\[\]{}:_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function applyClassificationRules(
  records: ExpenseRecord[],
  rules: ClassificationRule[],
): EffectiveExpense[] {
  const merchantRules = new Map<string, ClassificationRule>();
  const recordRules = new Map<string, ClassificationRule>();

  for (const rule of rules) {
    if (rule.scope === "record" && rule.recordId) recordRules.set(rule.recordId, rule);
    if (rule.scope === "merchant" && rule.merchantKey) merchantRules.set(rule.merchantKey, rule);
  }

  return records.map((record) => {
    const rule = recordRules.get(record.id) ?? merchantRules.get(normalizeMerchant(record.merchant));
    return {
      ...record,
      originalDomain: record.domain,
      originalCategory: record.category,
      domain: rule?.domain ?? record.domain,
      category: rule?.category ?? record.category,
      appliedRuleId: rule?.id,
    };
  });
}

export function countRuleMatches(records: ExpenseRecord[], rule: ClassificationRule): number {
  if (rule.scope === "record") return records.some((row) => row.id === rule.recordId) ? 1 : 0;
  return records.filter((row) => normalizeMerchant(row.merchant) === rule.merchantKey).length;
}
