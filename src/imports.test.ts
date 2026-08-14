import { describe, expect, it } from "vitest";
import { MAX_FILE_SIZE, detectFinancialFileKind, formatFileSize, getFileExtension, validateFinancialFile } from "./imports";

describe("financial file intake", () => {
  it("accepts the supported spreadsheet and data formats", () => {
    expect(validateFinancialFile("charges.xlsx", 100)).toBeNull();
    expect(validateFinancialFile("account.CSV", 100)).toBeNull();
    expect(validateFinancialFile("report.json", 100)).toBeNull();
  });

  it("rejects unsupported and oversized files", () => {
    expect(validateFinancialFile("statement.pdf", 100)).toBe("unsupported-type");
    expect(validateFinancialFile("statement.xlsx", MAX_FILE_SIZE + 1)).toBe("file-too-large");
  });

  it("extracts extensions safely", () => {
    expect(getFileExtension("monthly.report.XLSX")).toBe("xlsx");
    expect(getFileExtension("no-extension")).toBe("no-extension");
  });

  it("detects common credit-card and bank-account filenames", () => {
    expect(detectFinancialFileKind("visa-july.xlsx")).toBe("credit-card");
    expect(detectFinancialFileKind("דוח-אשראי.csv")).toBe("credit-card");
    expect(detectFinancialFileKind("checking-account.csv")).toBe("bank-account");
    expect(detectFinancialFileKind("חשבון-בנק.xlsx")).toBe("bank-account");
    expect(detectFinancialFileKind("annual-report.json")).toBe("financial-report");
  });

  it("formats file sizes for the selected locale", () => {
    expect(formatFileSize(1536, "en-US")).toBe("1.5 KB");
    expect(formatFileSize(2 * 1024 * 1024, "en-US")).toBe("2 MB");
  });
});
