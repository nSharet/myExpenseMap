import { describe, expect, it } from "vitest";
import { aggregateExpensesByPeriod, bucketIdentity, suggestedGranularity, trendSegments, type TrendGranularity } from "./expense-trend";
import type { EffectiveExpense } from "./types";

function row(date: string, amount: number, id = `${date}-${amount}`): EffectiveExpense {
  return { id, date, month: date.slice(0, 7), amount, domain: "D", category: "C", merchant: "M", owner: "O", card: "", type: "", nature: "", originalDomain: "D", originalCategory: "C" };
}

describe("expense trend aggregation", () => {
  it.each<[TrendGranularity, string]>([["month","2026-02-month"],["twoMonths","2026-01-twoMonths"],["quarter","2026-01-quarter"],["halfYear","2026-01-halfYear"],["year","2026-01-year"]])("uses calendar boundaries for %s", (granularity, key) => {
    expect(bucketIdentity(2026, 2, granularity).key).toBe(key);
  });

  it("preserves signed totals, counts, credits and a populated zero", () => {
    const buckets = aggregateExpensesByPeriod([row("2026-01-01", 3000), row("2026-01-12", -100), row("2026-02-01", 100), row("2026-02-02", -100)], "month");
    expect(buckets.map(({amount,count,credits}) => ({amount,count,credits}))).toEqual([{amount:2900,count:2,credits:-100},{amount:0,count:2,credits:-100}]);
  });

  it("represents sparse periods as null and breaks segments", () => {
    const buckets = aggregateExpensesByPeriod([row("2026-01-01", 2000), row("2026-02-01", 3000), row("2026-04-01", 4000)], "month");
    expect(buckets.map((b) => b.amount)).toEqual([2000,3000,null,4000]);
    expect(trendSegments(buckets).map((segment) => segment.map((b) => b.amount))).toEqual([[2000,3000],[4000]]);
  });

  it("can retain the complete dataset range without leaking values from outside scope", () => {
    const scoped = [row("2026-02-01", 50)];
    const all = [row("2026-01-01", 999, "outside-1"), ...scoped, row("2026-03-01", 888, "outside-2")];
    expect(aggregateExpensesByPeriod(scoped, "month", all).map((b) => b.amount)).toEqual([null, 50, null]);
  });

  it("never crosses years for two-month, quarter or half-year buckets", () => {
    for (const granularity of ["twoMonths","quarter","halfYear"] as TrendGranularity[]) {
      const buckets = aggregateExpensesByPeriod([row("2025-12-31", 1), row("2026-01-01", 2)], granularity);
      expect(buckets.filter((b) => b.amount !== null).map((b) => [b.year,b.amount])).toEqual([[2025,1],[2026,2]]);
    }
  });

  it("is timezone safe because YYYY-MM fields are parsed directly", () => {
    expect(aggregateExpensesByPeriod([row("2026-01-01", 7)], "month")[0]).toMatchObject({year:2026,startMonth:1,amount:7});
  });

  it("conserves exact totals at every granularity for mixed years and refunds", () => {
    const records=[row("2025-12-20",100),row("2026-01-02",-25),row("2026-07-02",50)];
    for (const granularity of ["month","twoMonths","quarter","halfYear","year"] as TrendGranularity[]) {
      expect(aggregateExpensesByPeriod(records,granularity).reduce((sum,b)=>sum+(b.amount??0),0)).toBe(125);
    }
  });

  it("handles refund-only, one-point, invalid-date, and long-range defaults", () => {
    expect(aggregateExpensesByPeriod([row("2026-03-01",-50)],"month")[0].amount).toBe(-50);
    expect(aggregateExpensesByPeriod([row("invalid",10)],"month")).toEqual([]);
    expect(suggestedGranularity([row("2024-01-01",1),row("2026-01-01",1)])).toBe("quarter");
    expect(suggestedGranularity([row("2026-01-01",1)])).toBe("month");
  });
});
