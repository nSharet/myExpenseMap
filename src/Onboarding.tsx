import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { locales, supportedLanguages, type Language } from "./i18n";
import { buildPreview, detectFinancialFileKind, formatFileSize, readFinancialFile, validateFinancialFile, type ColumnMapping, type ImportPreview, type SelectedFinancialFile } from "./imports";
import type { createI18n } from "./i18n";
import type { ExpenseRecord } from "./types";

type I18n = ReturnType<typeof createI18n>;
type View = "landing" | "upload" | "processing" | "preview";

type Props = {
  i18n: I18n;
  language: Language;
  onLanguageChange: (language: Language) => void;
  onOpenExplorer: (records?: ExpenseRecord[]) => void;
};

export default function Onboarding({ i18n, language, onLanguageChange, onOpenExplorer }: Props) {
  const { t } = i18n;
  const [view, setView] = useState<View>("landing");
  const [files, setFiles] = useState<SelectedFinancialFile[]>([]);
  const [error, setError] = useState("");
  const [previews, setPreviews] = useState<ImportPreview[]>([]);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(incoming: File[]) {
    setError("");
    const accepted: SelectedFinancialFile[] = [];
    for (const file of incoming) {
      const validationError = validateFinancialFile(file.name, file.size);
      if (validationError) {
        setError(t(validationError === "unsupported-type" ? "invalidFileType" : "fileTooLarge"));
        continue;
      }
      accepted.push({ id: `${file.name}-${file.size}-${file.lastModified}`, name: file.name, size: file.size, kind: detectFinancialFileKind(file.name), file });
    }
    setFiles((current) => [...current, ...accepted.filter((candidate) => !current.some((item) => item.id === candidate.id))]);
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files || []));
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    addFiles(Array.from(event.dataTransfer.files));
  }

  const sourceLabel = (kind: SelectedFinancialFile["kind"]) => t(kind === "credit-card" ? "creditCard" : kind === "bank-account" ? "bankAccount" : "financialReport");
  const copy = language === "he" ? {
    process:"ניתוח קבצים מקומי", preview:"בדיקה לפני הייבוא", privacy:"הנתונים עובדו בדפדפן בלבד ולא נשלחו או נשמרו.", map:"יש למפות את עמודות החובה", date:"תאריך", merchant:"בית עסק / תיאור", amount:"סכום חיוב", rows:"עסקאות תקינות", skipped:"שורות שנדחו", duplicates:"כפילויות שלא ייובאו", confirm:"אישור ופתיחת המפה", failed:"לא ניתן לקרוא את הקובץ", back:"חזרה לקבצים",
  } : { process:"Process files locally", preview:"Review before import", privacy:"Data was processed only in this browser and was not sent or stored.", map:"Map the required columns", date:"Date", merchant:"Merchant / description", amount:"Charged amount", rows:"valid transactions", skipped:"skipped rows", duplicates:"duplicates excluded", confirm:"Confirm and open expense map", failed:"The file could not be read", back:"Back to files" };

  async function processFiles() {
    setError(""); setProcessing(true); setView("processing");
    try {
      const tables = (await Promise.all(files.map(readFinancialFile))).flat();
      if (!tables.length) throw new Error("No transaction table was found.");
      const seen = new Set<string>(); setPreviews(tables.map((table) => buildPreview(table, undefined, seen))); setView("preview");
    } catch (reason) { setError(`${copy.failed}: ${reason instanceof Error ? reason.message : String(reason)}`); setView("upload"); }
    finally { setProcessing(false); }
  }

  function updateMapping(index: number, field: "date"|"merchant"|"amount", value: string) {
    setPreviews((current) => { const next=[...current]; const mapping:ColumnMapping={...next[index].mapping,[field]:value||undefined}; next[index]=buildPreview(next[index].table,mapping); return next; });
  }

  return <main className="onboarding" dir={i18n.direction}>
    <header className="landing-header">
      <button className="brand brand-button" onClick={() => setView("landing")}>
        <span className="brand-mark">₪</span>
        <span><strong>{t("appTitle")}</strong><small>{t("productTagline")}</small></span>
      </button>
      <label className="language-picker"><span>{t("language")}</span><select value={language} onChange={(event) => onLanguageChange(event.target.value as Language)} aria-label={t("language")}>{supportedLanguages.map((code) => <option value={code} key={code}>{locales[code].displayName}</option>)}</select></label>
    </header>

    {view === "landing" && <>
      <section className="landing-hero">
        <div className="landing-copy">
          <p className="eyebrow">{t("productTagline")}</p>
          <h1>{t("heroTitle")}</h1>
          <p>{t("heroDescription")}</p>
          <div className="hero-actions">
            <button className="primary large-button" onClick={() => setView("upload")}>{t("uploadData")}</button>
            <button className="secondary large-button" onClick={() => onOpenExplorer()}>{t("exploreDemo")}</button>
          </div>
        </div>
        <div className="preview-card" aria-hidden="true">
          <div className="preview-total"><span>{t("viewTotal")}</span><strong>{i18n.formatMoney(18542.8)}</strong></div>
          {[68, 48, 35, 24].map((width, index) => <div className="preview-row" key={width}><span>{String(index + 1).padStart(2, "0")}</span><i><b style={{ width: `${width}%` }} /></i><em>{["34%", "24%", "18%", "12%"][index]}</em></div>)}
        </div>
      </section>

      <section className="privacy-banner">
        <span className="privacy-lock">✓</span>
        <div><small>{t("localOnlyBadge")}</small><h2>{t("localOnlyTitle")}</h2><p>{t("localOnlyDescription")}</p></div>
      </section>

      <section className="landing-section">
        <p className="eyebrow">{t("howItWorks")}</p>
        <div className="steps-grid">
          {[["01", "stepUploadTitle", "stepUploadDescription"], ["02", "stepNormalizeTitle", "stepNormalizeDescription"], ["03", "stepExploreTitle", "stepExploreDescription"]].map(([number, title, description]) => <article key={number}><span>{number}</span><h3>{t(title as Parameters<typeof t>[0])}</h3><p>{t(description as Parameters<typeof t>[0])}</p></article>)}
        </div>
      </section>

      <section className="landing-section source-section">
        <p className="eyebrow">{t("supportedSources")}</p>
        <div className="source-grid">
          <article><span>CC</span><b>{t("creditCard")}</b><small>Excel · CSV</small></article>
          <article><span>BA</span><b>{t("bankAccount")}</b><small>Excel · CSV</small></article>
          <article><span>FR</span><b>{t("financialReport")}</b><small>Excel · CSV · JSON</small></article>
        </div>
      </section>
    </>}

    {view === "upload" && <section className="upload-shell">
      <div className="upload-heading"><p className="eyebrow">{t("uploadData")}</p><h1>{t("uploadTitle")}</h1><p>{t("uploadDescription")}</p></div>
      <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
        <input ref={inputRef} type="file" multiple accept=".xlsx,.xls,.csv,.json" onChange={handleInput} />
        <span className="upload-symbol">＋</span>
        <h2>{t("dropFiles")}</h2>
        <button className="secondary" onClick={() => inputRef.current?.click()}>{t("browseFiles")}</button>
        <small>{t("supportedFormats")}</small>
      </div>
      {error && <p className="upload-error" role="alert">{error}</p>}
      {files.length > 0 && <section className="selected-files"><h2>{t("selectedFiles")}</h2>{files.map((file) => <article key={file.id}><span className="file-type">{file.name.split(".").pop()?.toUpperCase()}</span><div><b>{file.name}</b><small>{sourceLabel(file.kind)} · {formatFileSize(file.size, i18n.locale)}</small></div><button onClick={() => setFiles((current) => current.filter((item) => item.id !== file.id))} aria-label={t("removeFile", { name: file.name })}>×</button></article>)}</section>}
      <div className="upload-actions"><button className="secondary" onClick={() => setView("landing")}>{t("backHome")}</button><button className="primary" disabled={!files.length || processing} onClick={processFiles}>{copy.process}</button></div>
    </section>}

    {view === "processing" && <section className="processing-shell">
      <div className="processing-orbit"><span>…</span></div>
      <p className="eyebrow">{copy.process}</p>
      <h1>{t("processingTitle")}</h1><p>{t("processingDescription")}</p>
      <div className="processing-list">
        {["processingStageValidate", "processingStageNormalize", "processingStageCategorize"].map((key, index) => <div className="active" key={key}><span>{index + 1}</span><b>{t(key as Parameters<typeof t>[0])}</b></div>)}
      </div>
    </section>}

    {view === "preview" && <section className="upload-shell import-preview">
      <div className="upload-heading"><p className="eyebrow">{copy.process}</p><h1>{copy.preview}</h1><p>{copy.privacy}</p></div>
      {previews.map((preview,index) => <article className="preview-table" key={`${preview.table.fileId}-${preview.table.sheet}`}>
        <header><div><b>{preview.table.fileName}</b><small>{preview.table.sheet}</small></div><span>{preview.records.length} {copy.rows}</span></header>
        {preview.needsMapping && <div className="mapping-grid"><strong>{copy.map}</strong>{(["date","merchant","amount"] as const).map((field) => <label key={field}>{copy[field]}<select value={preview.mapping[field]??""} onChange={(event)=>updateMapping(index,field,event.target.value)}><option value="">—</option>{preview.table.headers.map((header)=><option value={header} key={header}>{header}</option>)}</select></label>)}</div>}
        <div className="diagnostic-row"><span>{preview.diagnostics.length} {copy.skipped}</span><span>{preview.duplicates} {copy.duplicates}</span></div>
        {!!preview.records.length && <div className="table-wrap"><table><thead><tr><th>{copy.date}</th><th>{copy.merchant}</th><th>{copy.amount}</th></tr></thead><tbody>{preview.records.slice(0,8).map((row)=><tr key={row.id}><td>{row.date}</td><td>{row.merchant}</td><td>{i18n.formatMoney(row.amount)}</td></tr>)}</tbody></table></div>}
      </article>)}
      <div className="upload-actions"><button className="secondary" onClick={()=>setView("upload")}>{copy.back}</button><button className="primary" disabled={previews.some((item)=>item.needsMapping)||!previews.some((item)=>item.records.length)} onClick={()=>onOpenExplorer(previews.flatMap((item)=>item.records))}>{copy.confirm}</button></div>
    </section>}
  </main>;
}
