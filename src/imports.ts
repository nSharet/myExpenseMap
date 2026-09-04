export type FinancialFileKind = "credit-card" | "bank-account" | "financial-report";

export type SelectedFinancialFile = {
  id: string;
  name: string;
  size: number;
  kind: FinancialFileKind;
  file: File;
};

export type SemanticField = "date" | "merchant" | "amount" | "currency" | "card" | "owner" | "installment" | "installmentNumber" | "installmentTotal" | "originalAmount";
export type ColumnMapping = Partial<Record<SemanticField, string>>;
export type RawTable = { fileId: string; fileName: string; sheet: string; headers: string[]; rows: Record<string, unknown>[] };
export type ImportDiagnostic = { level: "warning" | "error"; message: string; row?: number };
export type ImportPreview = { table: RawTable; mapping: ColumnMapping; confidence: number; needsMapping: boolean; records: import("./types").ExpenseRecord[]; diagnostics: ImportDiagnostic[]; duplicates: number };

export type FileValidationError = "unsupported-type" | "file-too-large";

export const MAX_FILE_SIZE = 15 * 1024 * 1024;
export const MAX_ROWS = 20_000;
export const MAX_SHEETS = 10;
const supportedExtensions = new Set(["csv", "xlsx", "xls", "json"]);

export function getFileExtension(fileName: string) {
  return fileName.toLocaleLowerCase().split(".").pop() || "";
}

export function validateFinancialFile(fileName: string, size: number): FileValidationError | null {
  if (!supportedExtensions.has(getFileExtension(fileName))) return "unsupported-type";
  if (size > MAX_FILE_SIZE) return "file-too-large";
  return null;
}

export function detectFinancialFileKind(fileName: string): FinancialFileKind {
  const normalized = fileName.toLocaleLowerCase();
  if (/visa|mastercard|isracard|amex|credit|card|אשראי|כרטיס/.test(normalized)) return "credit-card";
  if (/bank|checking|account|current|עו[״\"']?ש|בנק|חשבון/.test(normalized)) return "bank-account";
  return "financial-report";
}

export function formatFileSize(size: number, locale: string) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(size / 1024)} KB`;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(size / (1024 * 1024))} MB`;
}

const aliases: Record<SemanticField, RegExp[]> = {
  date: [/^date$/, /transaction.?date/, /purchase.?date/, /תאריך(?: עסקה| רכישה)?/, /מועד/],
  merchant: [/merchant/, /business/, /description/, /details/, /payee/, /vendor/, /שם בית עסק/, /בית עסק/, /תיאור/, /פרטים/],
  amount: [/^amount$/, /charged.?amount/, /debit/, /חיוב/, /סכום(?: חיוב)?/, /סך/],
  currency: [/currency/, /מטבע/], card: [/card/, /account/, /כרטיס/, /חשבון/], owner: [/owner/, /holder/, /בעלים/, /מחזיק/],
  installment: [/installment/, /תשלו(?:ם|מים)/], installmentNumber: [/installment.?number/, /payment.?number/, /מספר תשלום/],
  installmentTotal: [/total.?installments/, /number.?of.?payments/, /סך תשלומים/], originalAmount: [/original.?amount/, /purchase.?amount/, /סכום עסקה(?: מקורי)?/],
};

function normalizedHeader(value: string) { return value.normalize("NFKC").toLocaleLowerCase().replace(/[_\-./]+/g, " ").replace(/\s+/g, " ").trim(); }

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  let text = value.trim().replace(/[₪$€£\s]/g, "");
  const negative = /^\(.*\)$/.test(text) || text.endsWith("-");
  text = text.replace(/[()]/g, "").replace(/-$/, "");
  const lastComma = text.lastIndexOf(","), lastDot = text.lastIndexOf(".");
  if (lastComma > lastDot) text = text.replace(/\./g, "").replace(",", "."); else text = text.replace(/,/g, "");
  const result = Number(text);
  return Number.isFinite(result) ? (negative ? -result : result) : null;
}

function parseDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && value > 20_000 && value < 80_000) return new Date(Date.UTC(1899, 11, 30 + value)).toISOString().slice(0, 10);
  if (typeof value !== "string") return null;
  const text = value.trim();
  const localized = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (localized) { const year = Number(localized[3]) + (localized[3].length === 2 ? 2000 : 0); const d = new Date(Date.UTC(year, Number(localized[2]) - 1, Number(localized[1]))); return Number.isNaN(d.valueOf()) ? null : d.toISOString().slice(0, 10); }
  const date = new Date(text); return Number.isNaN(date.valueOf()) ? null : date.toISOString().slice(0, 10);
}

export function inferColumnMapping(headers: string[], rows: Record<string, unknown>[]) {
  const mapping: ColumnMapping = {}; const scores: Partial<Record<SemanticField, number>> = {};
  for (const field of Object.keys(aliases) as SemanticField[]) {
    for (const header of headers) {
      const normalized = normalizedHeader(header);
      let score = aliases[field].some((pattern) => pattern.test(normalized)) ? .8 : 0;
      const sample = rows.slice(0, 30).map((row) => row[header]).filter((value) => value !== "" && value != null);
      if (sample.length) {
        const valid = field === "date" ? sample.filter((value) => parseDate(value)).length : field === "amount" || field === "originalAmount" ? sample.filter((value) => parseNumber(value) != null).length : 0;
        if (valid / sample.length > .75) score += .2;
      }
      if (score > (scores[field] ?? 0)) { scores[field] = score; mapping[field] = header; }
    }
  }
  const required = ["date", "merchant", "amount"] as const;
  const confidence = required.reduce((total, field) => total + (scores[field] ?? 0), 0) / required.length;
  return { mapping, confidence, needsMapping: required.some((field) => !mapping[field]) || confidence < .65 };
}

function installment(value: unknown) { const match = String(value ?? "").match(/(\d+)\s*[\/]\s*(\d+)/); return match ? { number: Number(match[1]), total: Number(match[2]) } : {}; }
function stableHash(value: string) { let hash = 2166136261; for (let i=0;i<value.length;i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619); return (hash >>> 0).toString(36); }
export function transactionFingerprint(record: Pick<import("./types").ExpenseRecord, "date"|"merchant"|"amount"|"card">, installmentNumber?: number) { return [record.date, normalizedHeader(record.merchant), record.amount.toFixed(2), record.card, installmentNumber ?? ""].join("|"); }

export function normalizeTable(table: RawTable, mapping: ColumnMapping, seen = new Set<string>()): Omit<ImportPreview,"table"|"mapping"|"confidence"|"needsMapping"> {
  const records: import("./types").ExpenseRecord[] = []; const diagnostics: ImportDiagnostic[] = []; let duplicates = 0;
  if (!mapping.date || !mapping.merchant || !mapping.amount) return { records, diagnostics:[{level:"error",message:"Map date, merchant, and amount columns to continue."}], duplicates };
  table.rows.slice(0, MAX_ROWS).forEach((row, index) => {
    const date = parseDate(row[mapping.date!]); const merchant = String(row[mapping.merchant!] ?? "").trim(); const amount = parseNumber(row[mapping.amount!]);
    if (!date || !merchant || amount == null) { diagnostics.push({level:"warning",message:"Skipped row with an invalid required value.",row:index+2}); return; }
    const combined = mapping.installment ? installment(row[mapping.installment]) : {};
    const installmentNumber = mapping.installmentNumber ? parseNumber(row[mapping.installmentNumber]) ?? undefined : combined.number;
    const installmentTotal = mapping.installmentTotal ? parseNumber(row[mapping.installmentTotal]) ?? undefined : combined.total;
    const base = { date, merchant, amount: Math.abs(amount), card: mapping.card ? String(row[mapping.card] ?? "") : "" };
    const fingerprint = transactionFingerprint(base, installmentNumber);
    if (seen.has(fingerprint)) { duplicates++; return; } seen.add(fingerprint);
    records.push({ id:`import-${stableHash(`${table.fileId}|${table.sheet}|${index}|${fingerprint}`)}`, domain:"כספים ושונות", category:"לא מסווג", month:date.slice(0,7), ...base,
      owner:mapping.owner ? String(row[mapping.owner] ?? "") : "", type:"Imported", nature:amount < 0 ? "Credit" : "Expense",
      importMeta:{fileId:table.fileId,fileName:table.fileName,sheet:table.sheet,row:index+2,currency:mapping.currency?String(row[mapping.currency]??""):undefined,installmentNumber,installmentTotal,originalAmount:mapping.originalAmount?parseNumber(row[mapping.originalAmount])??undefined:undefined,warnings:[]},
    });
  });
  if (table.rows.length > MAX_ROWS) diagnostics.push({level:"warning",message:`Only the first ${MAX_ROWS} rows were processed.`});
  return { records, diagnostics, duplicates };
}

export async function readFinancialFile(selected: SelectedFinancialFile): Promise<RawTable[]> {
  const { read, utils } = await import("xlsx");
  const extension = getFileExtension(selected.name); let workbook;
  if (extension === "csv") { workbook = read(await selected.file.arrayBuffer(), {type:"array", raw:false}); }
  else if (extension === "xls" || extension === "xlsx") { workbook = read(await selected.file.arrayBuffer(), {type:"array", cellDates:true}); }
  else {
    const parsed = JSON.parse(await selected.file.text()) as unknown;
    const collection = Array.isArray(parsed) ? parsed : Object.values((parsed && typeof parsed === "object" ? parsed : {}) as Record<string,unknown>).find(Array.isArray);
    if (!Array.isArray(collection)) throw new Error("No transaction collection was found in this JSON file.");
    const rows = collection.filter((row): row is Record<string,unknown> => !!row && typeof row === "object" && !Array.isArray(row));
    return [{fileId:selected.id,fileName:selected.name,sheet:"JSON",headers:[...new Set(rows.flatMap(Object.keys))],rows:rows.slice(0,MAX_ROWS)}];
  }
  return workbook.SheetNames.slice(0,MAX_SHEETS).map((sheet) => { const rows = utils.sheet_to_json<Record<string,unknown>>(workbook.Sheets[sheet], {defval:"",raw:false}); return {fileId:selected.id,fileName:selected.name,sheet,headers:[...new Set(rows.flatMap(Object.keys))],rows:rows.slice(0,MAX_ROWS)}; }).filter((table) => table.rows.length > 0);
}

export function buildPreview(table: RawTable, mapping?: ColumnMapping, seen?: Set<string>): ImportPreview {
  const inferred = inferColumnMapping(table.headers, table.rows); const active = mapping ?? inferred.mapping; const normalized = normalizeTable(table, active, seen);
  return {table,mapping:active,confidence:inferred.confidence,needsMapping:!active.date||!active.merchant||!active.amount, ...normalized};
}
