export type FinancialFileKind = "credit-card" | "bank-account" | "financial-report";

export type SelectedFinancialFile = {
  id: string;
  name: string;
  size: number;
  kind: FinancialFileKind;
};

export type FileValidationError = "unsupported-type" | "file-too-large";

export const MAX_FILE_SIZE = 15 * 1024 * 1024;
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
