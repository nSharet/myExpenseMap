import { describe, expect, it } from "vitest";
import { MAX_FILE_SIZE, buildPreview, detectFinancialFileKind, formatFileSize, getFileExtension, inferColumnMapping, normalizeTable, validateFinancialFile, type RawTable } from "./imports";

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

describe("generic transaction normalization", () => {
  const table: RawTable = { fileId:"f1",fileName:"statement.csv",sheet:"Sheet1",headers:["תאריך עסקה","שם בית עסק","סכום חיוב","תשלומים","סכום עסקה מקורי"],rows:[
    {"תאריך עסקה":"04/08/2026","שם בית עסק":"Coffee Place","סכום חיוב":"₪ 25.50","תשלומים":"3/12","סכום עסקה מקורי":"306"},
    {"תאריך עסקה":"05/08/2026","שם בית עסק":"Refund","סכום חיוב":"(10.00)","תשלומים":""},
  ]};

  it("infers Hebrew required columns regardless of order", () => {
    const result=inferColumnMapping(table.headers,table.rows);
    expect(result.mapping).toMatchObject({date:"תאריך עסקה",merchant:"שם בית עסק",amount:"סכום חיוב"});
    expect(result.needsMapping).toBe(false);
  });

  it("normalizes amounts, dates, installment metadata, and credits", () => {
    const preview=buildPreview(table);
    expect(preview.records[0]).toMatchObject({date:"2026-08-04",merchant:"Coffee Place",amount:25.5,nature:"Expense",importMeta:{installmentNumber:3,installmentTotal:12,originalAmount:306}});
    expect(preview.records[1]).toMatchObject({amount:10,nature:"Credit"});
  });

  it("requires manual mapping when semantics are ambiguous", () => {
    const ambiguous:RawTable={...table,headers:["A","B","C"],rows:[{A:"04/08/2026",B:"Shop",C:"20"}]};
    expect(buildPreview(ambiguous).needsMapping).toBe(true);
    expect(buildPreview(ambiguous,{date:"A",merchant:"B",amount:"C"}).records).toHaveLength(1);
  });

  it("skips malformed rows and detects exact duplicates without merging installments", () => {
    const mapping={date:"date",merchant:"merchant",amount:"amount",installment:"part"} as const;
    const rows:RawTable={fileId:"x",fileName:"x.json",sheet:"JSON",headers:["date","merchant","amount","part"],rows:[
      {date:"2026-01-01",merchant:"Store",amount:50,part:"1/3"},{date:"2026-01-01",merchant:"Store",amount:50,part:"1/3"},{date:"2026-01-01",merchant:"Store",amount:50,part:"2/3"},{date:"bad",merchant:"",amount:"?",part:""},
    ]};
    const result=normalizeTable(rows,mapping);
    expect(result.records).toHaveLength(2); expect(result.duplicates).toBe(1); expect(result.diagnostics).toHaveLength(1);
  });
});
