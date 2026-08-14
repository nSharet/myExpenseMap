import { describe, expect, it } from "vitest";
import { applyClassificationRules, normalizeMerchant } from "./classification";
import type { ClassificationRule, ExpenseRecord } from "./types";

const base: ExpenseRecord[] = [
  { id: "1", domain: "רכב", category: "תחזוקה", month: "2026-01", date: "2026-01-01", merchant: "חוג-רון בע״מ", amount: 100, owner: "", card: "", type: "", nature: "" },
  { id: "2", domain: "רכב", category: "תחזוקה", month: "2026-02", date: "2026-02-01", merchant: "חוג רון בעמ", amount: 120, owner: "", card: "", type: "", nature: "" },
];

describe("classification", () => {
  it("normalizes punctuation and whitespace", () => {
    expect(normalizeMerchant("  חוג-רון  ")).toBe("חוג רון");
    expect(normalizeMerchant("חוג רון בע״מ")).toBe(normalizeMerchant("חוג רון בעמ"));
  });

  it("applies merchant rules to every matching record", () => {
    const rule: ClassificationRule = { id: "r1", scope: "merchant", merchantKey: normalizeMerchant("חוג-רון בע״מ"), merchantLabel: "חוג-רון בע״מ", domain: "משפחה", category: "חוגים", createdAt: "2026-01-01" };
    const changed = applyClassificationRules(base, [rule]);
    expect(changed[0].category).toBe("חוגים");
    expect(changed[1].category).toBe("חוגים");
    expect(changed[0].originalCategory).toBe("תחזוקה");
  });

  it("lets a record rule override a merchant rule", () => {
    const merchant: ClassificationRule = { id: "m", scope: "merchant", merchantKey: normalizeMerchant(base[0].merchant), merchantLabel: base[0].merchant, domain: "משפחה", category: "חוגים", createdAt: "2026-01-01" };
    const record: ClassificationRule = { id: "x", scope: "record", recordId: "1", merchantLabel: base[0].merchant, domain: "אחר", category: "בדיקה", createdAt: "2026-01-02" };
    expect(applyClassificationRules(base, [merchant, record])[0].category).toBe("בדיקה");
  });
});
