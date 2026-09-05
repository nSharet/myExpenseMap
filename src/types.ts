export type ExpenseRecord = {
  id: string;
  domain: string;
  category: string;
  month: string;
  date: string;
  merchant: string;
  amount: number;
  owner: string;
  card: string;
  type: string;
  nature: string;
  importMeta?: {
    fileId: string;
    fileName: string;
    sheet: string;
    row: number;
    currency?: string;
    installmentNumber?: number;
    installmentTotal?: number;
    originalAmount?: number;
    warnings: string[];
  };
};

export type ClassificationRule = {
  id: string;
  scope: "merchant" | "record";
  merchantKey?: string;
  recordId?: string;
  merchantLabel: string;
  domain: string;
  category: string;
  createdAt: string;
};

export type EffectiveExpense = ExpenseRecord & {
  originalDomain: string;
  originalCategory: string;
  appliedRuleId?: string;
};
