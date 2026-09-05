import type { EffectiveExpense } from "./types";

export type TrendGranularity = "month" | "twoMonths" | "quarter" | "halfYear" | "year";
export type TrendBucket = {
  key: string;
  year: number;
  startMonth: number;
  endMonth: number;
  amount: number | null;
  count: number;
  credits: number;
};

const width: Record<TrendGranularity, number> = { month: 1, twoMonths: 2, quarter: 3, halfYear: 6, year: 12 };

function readDate(record: Pick<EffectiveExpense, "date" | "month">) {
  const match = /^(\d{4})-(\d{2})/.exec(record.date || record.month);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return year > 0 && month >= 1 && month <= 12 ? { year, month } : null;
}

export function bucketIdentity(year: number, month: number, granularity: TrendGranularity) {
  const bucketWidth = width[granularity];
  const startMonth = Math.floor((month - 1) / bucketWidth) * bucketWidth + 1;
  return { key: `${year}-${String(startMonth).padStart(2, "0")}-${granularity}`, year, startMonth, endMonth: startMonth + bucketWidth - 1 };
}

export function aggregateExpensesByPeriod(records: EffectiveExpense[], granularity: TrendGranularity, rangeRecords: EffectiveExpense[] = records): TrendBucket[] {
  const dated = records.flatMap((record) => {
    const date = readDate(record);
    return date ? [{ record, ...date }] : [];
  });
  if (!dated.length) return [];
  const rangeDated = rangeRecords.map(readDate).filter((date): date is { year: number; month: number } => date !== null);
  const observations = new Map<string, TrendBucket>();
  for (const { record, year, month } of dated) {
    const identity = bucketIdentity(year, month, granularity);
    const bucket = observations.get(identity.key) ?? { ...identity, amount: 0, count: 0, credits: 0 };
    bucket.amount! += record.amount;
    bucket.count += 1;
    if (record.amount < 0) bucket.credits += record.amount;
    observations.set(identity.key, bucket);
  }
  const range = rangeDated.length ? rangeDated : dated;
  const first = range.reduce((a, b) => a.year * 12 + a.month <= b.year * 12 + b.month ? a : b);
  const last = range.reduce((a, b) => a.year * 12 + a.month >= b.year * 12 + b.month ? a : b);
  const output: TrendBucket[] = [];
  let cursor = bucketIdentity(first.year, first.month, granularity);
  const end = bucketIdentity(last.year, last.month, granularity);
  while (cursor.year * 12 + cursor.startMonth <= end.year * 12 + end.startMonth) {
    output.push(observations.get(cursor.key) ?? { ...cursor, amount: null, count: 0, credits: 0 });
    let nextMonth = cursor.startMonth + width[granularity];
    let nextYear = cursor.year;
    if (nextMonth > 12) { nextMonth = 1; nextYear += 1; }
    cursor = bucketIdentity(nextYear, nextMonth, granularity);
  }
  return output;
}

export function trendSegments(buckets: TrendBucket[]) {
  const segments: TrendBucket[][] = [];
  let current: TrendBucket[] = [];
  for (const bucket of buckets) {
    if (bucket.amount === null) { if (current.length) segments.push(current); current = []; }
    else current.push(bucket);
  }
  if (current.length) segments.push(current);
  return segments;
}

export function suggestedGranularity(records: EffectiveExpense[]): TrendGranularity {
  const dated = records.map(readDate).filter((date): date is { year: number; month: number } => date !== null);
  if (dated.length < 2) return "month";
  const values = dated.map(({ year, month }) => year * 12 + month);
  return Math.max(...values) - Math.min(...values) + 1 > 18 ? "quarter" : "month";
}
