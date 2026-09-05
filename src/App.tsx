import { useEffect, useMemo, useState } from "react";
import expenseData from "../data/demo-expenses.json";
import seedRules from "../data/demo-category-rules.json";
import { applyClassificationRules, countRuleMatches, normalizeMerchant } from "./classification";
import { createI18n, detectLanguage, locales, supportedLanguages, type Language } from "./i18n";
import Onboarding from "./Onboarding";
import PieChartView from "./PieChartView";
import ExpenseTrendPanel, { type TrendSeriesInput } from "./ExpenseTrendPanel";
import { getExpenseIcon } from "./category-icons";
import type { ClassificationRule, EffectiveExpense, ExpenseRecord } from "./types";

type Level = "root" | "domain" | "category" | "month";
type Crumb = { level: Level; value?: string; color?: string };
type Group = { name: string; amount: number; count: number };
type ViewMode = "list" | "pie";
type I18n = ReturnType<typeof createI18n>;

const STORAGE_KEY = "interactive-expense-explorer.demo-rules.v1";
const LANGUAGE_KEY = "interactive-expense-explorer.language";
const VIEW_MODE_KEY = "my-expense-map.view-mode";
const palette = ["#00a896", "#f4a261", "#3a86ff", "#e76f51", "#7b61ff", "#2a9d8f", "#ef476f", "#457b9d"];
const demoRecords = expenseData as ExpenseRecord[];
const initialPath: Crumb[] = [{ level: "root" }];

function sum(items: EffectiveExpense[]) { return items.reduce((total, row) => total + row.amount, 0); }
function readRules(): ClassificationRule[] {
  try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? JSON.parse(saved) as ClassificationRule[] : seedRules as ClassificationRule[]; }
  catch { return seedRules as ClassificationRule[]; }
}
function readViewMode(): ViewMode {
  return localStorage.getItem(VIEW_MODE_KEY) === "pie" ? "pie" : "list";
}

export default function App() {
  const [screen, setScreen] = useState<"onboarding" | "explorer">("onboarding");
  const [language, setLanguage] = useState<Language>(detectLanguage);
  const i18n = useMemo(() => createI18n(language), [language]);
  const { t } = i18n;
  const [rules, setRules] = useState<ClassificationRule[]>(readRules);
  const [path, setPath] = useState<Crumb[]>(initialPath);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"amount" | "name">("amount");
  const [viewMode, setViewMode] = useState<ViewMode>(readViewMode);
  const [editing, setEditing] = useState<EffectiveExpense | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [notice, setNotice] = useState("");
  const [records, setRecords] = useState<ExpenseRecord[]>(demoRecords);
  const imported = records !== demoRecords;

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(rules)); }, [rules]);
  useEffect(() => { localStorage.setItem(VIEW_MODE_KEY, viewMode); }, [viewMode]);
  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = i18n.direction;
    document.title = t("appTitle");
  }, [language, i18n.direction, t]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 3500); return () => clearTimeout(timer); }, [notice]);

  const effectiveRows = useMemo(() => applyClassificationRules(records, rules), [records, rules]);
  const current = path[path.length - 1];
  const scoped = useMemo(() => {
    let result = effectiveRows;
    const domain = path.find((x) => x.level === "domain")?.value;
    const category = path.find((x) => x.level === "category")?.value;
    const month = path.find((x) => x.level === "month")?.value;
    if (domain) result = result.filter((x) => x.domain === domain);
    if (category) result = result.filter((x) => x.category === category);
    if (month) result = result.filter((x) => x.month === month);
    return result;
  }, [effectiveRows, path]);
  const trendScoped = useMemo(() => {
    let result = effectiveRows;
    const domain = path.find((x) => x.level === "domain")?.value;
    const category = path.find((x) => x.level === "category")?.value;
    if (domain) result = result.filter((x) => x.domain === domain);
    if (category) result = result.filter((x) => x.category === category);
    return result;
  }, [effectiveRows, path]);

  const nextKey = current.level === "root" ? "domain" : current.level === "domain" ? "category" : current.level === "category" ? "month" : null;
  const groups = useMemo<Group[]>(() => {
    if (!nextKey) return [];
    const grouped = new Map<string, Group>();
    scoped.forEach((row) => {
      const key = row[nextKey];
      const previous = grouped.get(key) || { name: key, amount: 0, count: 0 };
      previous.amount += row.amount; previous.count += 1; grouped.set(key, previous);
    });
    return [...grouped.values()].sort((a,b) => sort === "amount" ? b.amount-a.amount : i18n.labelTaxonomy(a.name).localeCompare(i18n.labelTaxonomy(b.name), i18n.locale));
  }, [scoped, nextKey, sort, i18n]);

  const visibleRows = useMemo(() => scoped.filter((row) => {
    const q = query.trim().toLocaleLowerCase(i18n.locale);
    return !q || [row.merchant,row.owner,row.type,row.card].some((value) => value.toLocaleLowerCase(i18n.locale).includes(q));
  }).sort((a,b) => b.amount-a.amount), [scoped, query, i18n.locale]);

  const total = sum(scoped);
  const overall = sum(effectiveRows);
  const max = Math.max(...groups.map((group) => Math.abs(group.amount)), 1);
  const displayCurrent = current.level === "root" ? t("allExpenses") : current.level === "month" ? i18n.formatMonth(current.value!) : i18n.labelTaxonomy(current.value!);
  const displayGroup = (group: Group) => nextKey === "month" ? i18n.formatMonth(group.name) : i18n.labelTaxonomy(group.name);
  const trendSeries = useMemo<TrendSeriesInput[] | undefined>(() => current.level === "domain" && nextKey === "category" ? groups.map((group,index) => ({
    key: group.name,
    label: i18n.labelTaxonomy(group.name),
    color: group.amount < 0 ? "#0aaf82" : palette[index%palette.length],
    records: trendScoped.filter((row) => row.category === group.name),
  })) : undefined, [current.level, nextKey, groups, i18n, trendScoped]);

  function open(group: Group) {
    if (!nextKey) return;
    const color = nextKey === "month" && current.color ? current.color : group.amount < 0 ? "#0aaf82" : palette[groups.findIndex((item) => item.name === group.name) % palette.length];
    setPath((previous) => [...previous, { level: nextKey, value: group.name, color }]);
    setQuery("");
  }
  function saveRule(input: Omit<ClassificationRule, "id" | "createdAt" | "merchantLabel">) {
    if (!editing) return;
    const rule: ClassificationRule = { ...input, id: crypto.randomUUID(), merchantLabel: editing.merchant, createdAt: new Date().toISOString() };
    const withoutCollision = rules.filter((existing) => input.scope === "record"
      ? !(existing.scope === "record" && existing.recordId === input.recordId)
      : !(existing.scope === "merchant" && existing.merchantKey === input.merchantKey));
    setRules([...withoutCollision, rule]);
    const matches = countRuleMatches(records, rule);
    setEditing(null); setPath(initialPath);
    setNotice(matches === 1 ? t("updatedOne") : t("updatedMany", { count: i18n.formatInteger(matches) }));
  }
  function removeRule(id: string) { setRules((currentRules) => currentRules.filter((rule) => rule.id !== id)); setNotice(t("ruleRemoved")); }
  function exportRules() {
    const blob = new Blob([JSON.stringify(rules, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "category-rules.json"; anchor.click(); URL.revokeObjectURL(url);
  }

  if (screen === "onboarding") return <Onboarding i18n={i18n} language={language} onLanguageChange={setLanguage} onOpenExplorer={(importedRecords) => { if (importedRecords) { setRecords(importedRecords); setPath(initialPath); } setScreen("explorer"); }} />;

  return <main dir={i18n.direction}>
    <header className="topbar">
      <div className="brand"><span className="brand-mark">₪</span><div><strong>{t("appTitle")}</strong><small>{t("period")}</small></div></div>
      <div className="header-actions">
        <button className="home-button" onClick={() => { setPath(initialPath); setScreen("onboarding"); }}>{t("backHome")}</button>
        <label className="language-picker"><span>{t("language")}</span><select value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label={t("language")}>{supportedLanguages.map((code) => <option value={code} key={code}>{locales[code].displayName}</option>)}</select></label>
        <button className="rules-button" onClick={() => setShowRules(true)}>{t("manageClassifications")} <b>{i18n.formatInteger(rules.length)}</b></button>
        <div className="source-pill"><span className="status-dot" /> {imported ? (language === "he" ? "נתונים שיובאו" : "Imported data") : t("demoMode")}</div>
      </div>
    </header>

    <div className="shell">
      <div className="demo-notice">{imported ? (language === "he" ? "הנתונים נשמרים בזיכרון בלבד. רענון הדף יחייב העלאה מחדש." : "Data is kept in memory only. Refreshing requires a new upload.") : t("demoNotice")}</div>
      <nav className="breadcrumbs" aria-label={t("allExpenses")}>{path.map((crumb,index) => {
        const label = crumb.level === "root" ? t("allExpenses") : crumb.level === "month" ? i18n.formatMonth(crumb.value!) : i18n.labelTaxonomy(crumb.value!);
        return <span key={`${crumb.level}-${crumb.value || "all"}`}><button onClick={() => setPath(path.slice(0,index+1))}>{label}</button>{index < path.length-1 && <i>/</i>}</span>;
      })}</nav>
      <section className="hero"><div><p className="eyebrow">{current.level === "month" ? t("transactionDetails") : t("drillDown")}</p><h1>{displayCurrent}</h1><p className="subtitle">{t("includedTransactions", { count: i18n.formatInteger(scoped.length) })}</p></div><div className="total-card"><span>{t("viewTotal")}</span><strong>{i18n.formatMoney(total)}</strong><small>{t("shareOfTotal", { percent: i18n.formatPercent(total/overall) })}</small></div></section>

      {nextKey ? <>
        <div className="toolbar">
          <div><b>{i18n.formatInteger(groups.length)}</b> {t(nextKey === "domain" ? "domains" : nextKey === "category" ? "categories" : "months")}</div>
          <div className="toolbar-actions">
            <div className="view-toggle" role="group" aria-label={t("viewMode")}>
              <button className={viewMode === "list" ? "active" : ""} aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")}>{t("listView")}</button>
              <button className={viewMode === "pie" ? "active" : ""} aria-pressed={viewMode === "pie"} onClick={() => setViewMode("pie")}>{t("pieChartView")}</button>
            </div>
            <button className="print-button" onClick={() => window.print()} title={t("printReportHint")}><span aria-hidden="true">⇩</span>{t("printReport")}</button>
            <label>{t("sort")}<select value={sort} onChange={(event) => setSort(event.target.value as "amount"|"name")}><option value="amount">{t("sortAmount")}</option><option value="name">{t("sortName")}</option></select></label>
          </div>
        </div>
        {viewMode === "list" ? <>
          <section className="explorer" aria-label={t("allExpenses")}>{groups.map((group,index) => <button className={`expense-row${group.amount < 0 ? " credit-group" : ""}`} key={group.name} onDoubleClick={() => open(group)} onClick={(event) => { if (event.detail === 0) open(group); }} aria-label={t("openItem", { name: displayGroup(group) })}><span className="rank">{String(index+1).padStart(2,"0")}</span><span className="row-main"><span className="row-title"><b>{displayGroup(group)}</b><em>{i18n.formatInteger(group.count)} {t("transactions")}</em></span><span className="bar-track"><span className="bar" style={{width:`${Math.max(8,Math.abs(group.amount)/max*100)}%`,background:group.amount < 0 ? "#0aaf82" : palette[index%palette.length]}} /></span></span><span className="row-value"><b>{i18n.formatMoney(group.amount)}</b><em>{i18n.formatPercent(total === 0 ? 0 : group.amount/Math.abs(total))}</em></span><span className="open-button" onClick={(event) => { event.stopPropagation(); open(group); }}>{t("open")}</span></button>)}</section>
          <p className="hint">{t("interactionHint")}</p>
        </> : <PieChartView groups={groups} palette={palette} title={t("pieChartTitle", { name: displayCurrent })} totalLabel={t("viewTotal")} total={total} displayGroup={displayGroup} formatAmount={i18n.formatMoney} formatInteger={i18n.formatInteger} formatPercent={i18n.formatPercent} transactionLabel={t("transactions")} sliceLabel={(name, amount, percent) => t("pieSliceLabel", { name, amount, percent })} iconForGroup={(group) => getExpenseIcon(group.name, nextKey)} onOpen={open} />}
        {current.level !== "root" && <ExpenseTrendPanel records={trendScoped} series={trendSeries} rangeRecords={effectiveRows} scopeKey={path.filter((item) => item.level !== "month").map((item) => `${item.level}:${item.value}`).join("/")} title={displayCurrent} color={path.slice().reverse().find((item) => item.level !== "month" && item.color)?.color ?? palette[0]} language={language} formatAmount={i18n.formatMoney} formatInteger={i18n.formatInteger} />}
      </>
      : <><section className="records"><div className="records-head"><div><h2>{t("recordsTitle")}</h2><p>{t("recordsDescription")}</p></div><div className="records-tools"><button className="print-button" onClick={() => window.print()} title={t("printReportHint")}><span aria-hidden="true">⇩</span>{t("printReport")}</button><label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} /></label></div></div><div className="table-wrap"><table><thead><tr><th>{t("date")}</th><th>{t("merchant")}</th><th>{t("classification")}</th><th>{t("card")}</th><th>{t("amount")}</th><th></th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id}><td>{row.date ? i18n.formatDate(row.date) : "—"}</td><td><b>{row.merchant}</b><small>{row.owner}</small></td><td><span>{i18n.labelTaxonomy(row.category)}</span>{row.appliedRuleId && <small className="corrected">{t("corrected")}</small>}</td><td>{row.card ? `•••• ${row.card}` : "—"}</td><td className={row.amount < 0 ? "credit" : ""}>{i18n.formatMoney(row.amount)}</td><td><button className="edit-button" onClick={() => setEditing(row)}>{t("changeClassification")}</button></td></tr>)}</tbody><tfoot><tr><td colSpan={5}>{t("totalRecords", { count: i18n.formatInteger(visibleRows.length) })}</td><td>{i18n.formatMoney(sum(visibleRows))}</td></tr></tfoot></table></div></section><ExpenseTrendPanel records={trendScoped} scopeKey={path.filter((item) => item.level !== "month").map((item) => `${item.level}:${item.value}`).join("/")} title={path.find((item) => item.level === "category")?.value ? i18n.labelTaxonomy(path.find((item) => item.level === "category")!.value!) : displayCurrent} color={path.slice().reverse().find((item) => item.color)?.color ?? palette[0]} language={language} formatAmount={i18n.formatMoney} formatInteger={i18n.formatInteger} /></>}
    </div>

    {editing && <ClassificationDialog row={editing} allRows={effectiveRows} i18n={i18n} onClose={() => setEditing(null)} onSave={saveRule} />}
    {showRules && <RulesDialog rules={rules} i18n={i18n} onClose={() => setShowRules(false)} onRemove={removeRule} onExport={exportRules} />}
    {notice && <div className="toast" role="status">✓ {notice}</div>}
  </main>;
}

function ClassificationDialog({ row, allRows, i18n, onClose, onSave }: { row: EffectiveExpense; allRows: EffectiveExpense[]; i18n: I18n; onClose: () => void; onSave: (rule: Omit<ClassificationRule,"id"|"createdAt"|"merchantLabel">) => void }) {
  const { t } = i18n;
  const domains = [...new Set(allRows.map((item) => item.domain))].sort((a,b) => i18n.labelTaxonomy(a).localeCompare(i18n.labelTaxonomy(b),i18n.locale));
  const [scope,setScope] = useState<"merchant"|"record">("merchant");
  const [domain,setDomain] = useState(row.domain);
  const [category,setCategory] = useState(row.category);
  const [customDomain,setCustomDomain] = useState("");
  const [customCategory,setCustomCategory] = useState("");
  const categories = [...new Set(allRows.filter((item) => item.domain === domain).map((item) => item.category))].sort((a,b) => i18n.labelTaxonomy(a).localeCompare(i18n.labelTaxonomy(b),i18n.locale));
  const matchCount = allRows.filter((item) => normalizeMerchant(item.merchant) === normalizeMerchant(row.merchant)).length;
  const targetDomain = customDomain.trim() || domain;
  const targetCategory = customCategory.trim() || category;

  return <div className="modal-backdrop" onMouseDown={(event) => { if(event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="classification-title"><button className="close" onClick={onClose} aria-label={t("close")}>×</button><p className="eyebrow">{t("classificationEyebrow")}</p><h2 id="classification-title">{row.merchant}</h2><div className="before-after"><div><small>{t("currentClassification")}</small><b>{i18n.labelTaxonomy(row.domain)} · {i18n.labelTaxonomy(row.category)}</b></div><span>→</span><div><small>{t("recordAmount")}</small><b>{i18n.formatMoney(row.amount)}</b></div></div><fieldset><legend>{t("applyQuestion")}</legend><label className={scope === "merchant" ? "selected-option" : ""}><input type="radio" checked={scope === "merchant"} onChange={() => setScope("merchant")} /><span><b>{t("allMerchantRecords")}</b><small>{t("matchingRecords", { count: i18n.formatInteger(matchCount) })}</small></span></label><label className={scope === "record" ? "selected-option" : ""}><input type="radio" checked={scope === "record"} onChange={() => setScope("record")} /><span><b>{t("oneRecord")}</b><small>{t("noOtherImpact")}</small></span></label></fieldset><div className="form-grid"><label>{t("domain")}<select value={domain} onChange={(event) => { setDomain(event.target.value); setCategory(allRows.find((item) => item.domain === event.target.value)?.category || ""); setCustomDomain(""); }}>{domains.map((item) => <option key={item} value={item}>{i18n.labelTaxonomy(item)}</option>)}</select></label><label>{t("subcategory")}<select value={category} onChange={(event) => { setCategory(event.target.value); setCustomCategory(""); }}>{categories.map((item) => <option key={item} value={item}>{i18n.labelTaxonomy(item)}</option>)}</select></label><label>{t("newDomain")}<input value={customDomain} onChange={(event) => setCustomDomain(event.target.value)} placeholder={t("newDomainPlaceholder")} /></label><label>{t("newSubcategory")}<input value={customCategory} onChange={(event) => setCustomCategory(event.target.value)} placeholder={t("newSubcategoryPlaceholder")} /></label></div><div className="modal-actions"><button className="secondary" onClick={onClose}>{t("cancel")}</button><button className="primary" disabled={!targetDomain || !targetCategory} onClick={() => onSave({ scope, merchantKey: scope === "merchant" ? normalizeMerchant(row.merchant) : undefined, recordId: scope === "record" ? row.id : undefined, domain: targetDomain, category: targetCategory })}>{t("saveAndApply")}</button></div></section></div>;
}

function RulesDialog({ rules, i18n, onClose, onRemove, onExport }: { rules: ClassificationRule[]; i18n: I18n; onClose: () => void; onRemove: (id:string) => void; onExport: () => void }) {
  const { t } = i18n;
  return <div className="modal-backdrop" onMouseDown={(event) => { if(event.target === event.currentTarget) onClose(); }}><section className="modal rules-modal" role="dialog" aria-modal="true" aria-labelledby="rules-title"><button className="close" onClick={onClose} aria-label={t("close")}>×</button><p className="eyebrow">{t("mappingRules")}</p><h2 id="rules-title">{t("rulesTitle")}</h2><p className="modal-copy">{t("rulesDescription")}</p>{rules.length === 0 ? <div className="empty">{t("noRules")}</div> : <div className="rules-list">{rules.map((rule) => <article key={rule.id}><div><b>{rule.merchantLabel}</b><small>{t(rule.scope === "merchant" ? "merchantScope" : "recordScope")}</small></div><span>{i18n.labelTaxonomy(rule.domain)} · {i18n.labelTaxonomy(rule.category)}</span><button onClick={() => onRemove(rule.id)}>{t("remove")}</button></article>)}</div>}<div className="modal-actions"><button className="secondary" onClick={onClose}>{t("close")}</button><button className="primary" onClick={onExport} disabled={!rules.length}>{t("exportJson")}</button></div></section></div>;
}
