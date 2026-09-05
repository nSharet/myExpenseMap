import { useEffect, useMemo, useRef, useState } from "react";
import { aggregateExpensesByPeriod, suggestedGranularity, trendSegments, type TrendBucket, type TrendGranularity } from "./expense-trend";
import type { EffectiveExpense } from "./types";

type Props = {
  records: EffectiveExpense[]; rangeRecords?: EffectiveExpense[]; scopeKey: string; title: string; color: string; language: "he" | "en";
  formatAmount: (value: number) => string; formatInteger: (value: number) => string;
};
const labels = {
  en: { view: "View over time", hide: "Hide time trend", title: "over time", month: "Monthly", twoMonths: "Every two months", quarter: "Quarterly", halfYear: "Half-yearly", year: "Yearly", transactions: "transactions", credits: "credits", empty: "No dated transactions are available for this section." },
  he: { view: "הצג לאורך זמן", hide: "הסתר מגמת זמן", title: "לאורך זמן", month: "חודשי", twoMonths: "דו־חודשי", quarter: "רבעוני", halfYear: "חצי־שנתי", year: "שנתי", transactions: "עסקאות", credits: "זיכויים", empty: "אין עסקאות מתוארכות להצגה עבור חלק זה." },
};

function periodLabel(bucket: TrendBucket, language: "he" | "en") {
  if (bucket.startMonth === 1 && bucket.endMonth === 12) return String(bucket.year);
  if (bucket.endMonth - bucket.startMonth === 2) return language === "he" ? `רבעון ${Math.ceil(bucket.startMonth / 3)} ${bucket.year}` : `Q${Math.ceil(bucket.startMonth / 3)} ${bucket.year}`;
  if (bucket.endMonth - bucket.startMonth === 5) return language === "he" ? `חציון ${bucket.startMonth === 1 ? 1 : 2} ${bucket.year}` : `H${bucket.startMonth === 1 ? 1 : 2} ${bucket.year}`;
  const locale = language === "he" ? "he-IL" : "en-US";
  const start = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(bucket.year, bucket.startMonth - 1, 1)));
  if (bucket.startMonth === bucket.endMonth) return `${start} ${bucket.year}`;
  const end = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(bucket.year, bucket.endMonth - 1, 1)));
  return `${start}–${end} ${bucket.year}`;
}

export default function ExpenseTrendPanel({ records, rangeRecords, scopeKey, title, color, language, formatAmount, formatInteger }: Props) {
  const copy = labels[language];
  const [open, setOpen] = useState(false);
  const [granularity, setGranularity] = useState<TrendGranularity>(() => suggestedGranularity(records));
  const [active, setActive] = useState<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const buckets = useMemo(() => aggregateExpensesByPeriod(records, granularity, rangeRecords), [records, rangeRecords, granularity]);
  useEffect(() => { setActive(null); if (closeTimer.current) window.clearTimeout(closeTimer.current); }, [scopeKey, records]);
  useEffect(() => () => { if (closeTimer.current) window.clearTimeout(closeTimer.current); }, []);
  const show = (index: number) => { if (closeTimer.current) window.clearTimeout(closeTimer.current); setActive(index); };
  const toggle = (index: number) => { if (closeTimer.current) window.clearTimeout(closeTimer.current); setActive((value) => value === index ? null : index); };
  const scheduleHide = () => { if (closeTimer.current) window.clearTimeout(closeTimer.current); closeTimer.current = window.setTimeout(() => setActive(null), 1000); };
  return <section className={`trend-disclosure${open ? " is-open" : ""}`} data-scope={scopeKey}>
    <button className="trend-toggle" aria-expanded={open} aria-controls="expense-trend-panel" onClick={() => { setOpen((value) => !value); setActive(null); }}><span aria-hidden="true">↗</span>{open ? copy.hide : copy.view}</button>
    {open && <div id="expense-trend-panel" className="trend-panel">
      <div className="trend-heading"><div><p>{copy.title}</p><h2>{title}</h2></div><label><span className="sr-only">{copy.view}</span><select aria-label={copy.view} value={granularity} onChange={(event) => { setGranularity(event.target.value as TrendGranularity); setActive(null); }}>{(["month","twoMonths","quarter","halfYear","year"] as TrendGranularity[]).map((value) => <option key={value} value={value}>{copy[value]}</option>)}</select></label></div>
      {buckets.length ? <TrendChart buckets={buckets} color={color} language={language} formatAmount={formatAmount} formatInteger={formatInteger} active={active} show={show} toggle={toggle} scheduleHide={scheduleHide} /> : <p className="trend-empty">{copy.empty}</p>}
    </div>}
  </section>;
}

function TrendChart({ buckets, color, language, formatAmount, formatInteger, active, show, toggle, scheduleHide }: { buckets: TrendBucket[]; color: string; language: "he"|"en"; formatAmount:(n:number)=>string; formatInteger:(n:number)=>string; active:number|null; show:(n:number)=>void; toggle:(n:number)=>void; scheduleHide:()=>void }) {
  const copy = labels[language]; const W=760,H=300,L=62,R=22,T=26,B=58;
  const values=buckets.flatMap(b=>b.amount===null?[]:[b.amount]); const rawMin=Math.min(0,...values),rawMax=Math.max(0,...values);
  const min=rawMin===0&&rawMax===0?-1:rawMin,max=rawMin===0&&rawMax===0?1:rawMax,span=max-min;
  const labelStep=Math.max(1,Math.ceil(buckets.length/9));
  const x=(i:number)=>L+(buckets.length===1?(W-L-R)/2:i*(W-L-R)/(buckets.length-1)); const y=(v:number)=>T+(max-v)*(H-T-B)/span;
  const segments=trendSegments(buckets); const indexOf=(b:TrendBucket)=>buckets.indexOf(b);
  const description=buckets.filter(b=>b.amount!==null).map(b=>`${periodLabel(b,language)}: ${formatAmount(b.amount!)}`).join("; ");
  return <div className="trend-chart-wrap"><svg className="trend-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="trend-chart-title trend-chart-desc">
    <title id="trend-chart-title">{copy.view}</title><desc id="trend-chart-desc">{description}</desc>
    <line className="trend-axis" x1={L} x2={W-R} y1={y(0)} y2={y(0)} />
    <text className="trend-y-label" x={L-8} y={T+5}>{formatAmount(max)}</text><text className="trend-y-label" x={L-8} y={H-B+5}>{formatAmount(min)}</text>
    {segments.map((segment,i)=><polyline key={i} data-testid="trend-segment" points={segment.map(b=>`${x(indexOf(b))},${y(b.amount!)}`).join(" ")} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />)}
    {buckets.map((bucket,index)=><g key={bucket.key}>
      {bucket.amount!==null && <circle data-testid="trend-point" data-period={bucket.key} data-value={bucket.amount} tabIndex={0} role="button" aria-label={`${periodLabel(bucket,language)}, ${formatAmount(bucket.amount)}, ${formatInteger(bucket.count)} ${copy.transactions}${bucket.credits<0?`, ${formatAmount(bucket.credits)} ${copy.credits}`:""}`} cx={x(index)} cy={y(bucket.amount)} r={active===index?7:5} fill={bucket.amount<0?"#0aaf82":color} stroke="white" strokeWidth="3" onMouseEnter={()=>show(index)} onMouseLeave={scheduleHide} onFocus={()=>show(index)} onBlur={scheduleHide} onClick={(event)=>{ if ((event.nativeEvent as PointerEvent).pointerType === "touch") toggle(index); }} />}
      {(index%labelStep===0||index===buckets.length-1) && <text className="trend-x-label" x={x(index)} y={H-B+24}>{periodLabel(bucket,language)}</text>}
    </g>)}
    {active!==null && buckets[active]?.amount!==null && <foreignObject x={Math.max(L,Math.min(W-R-116,x(active)-58))} y={Math.max(3,y(buckets[active].amount!)-52)} width="116" height="42" onMouseEnter={()=>show(active)} onMouseLeave={scheduleHide}><div className="trend-tooltip" role="tooltip"><b>{periodLabel(buckets[active],language)}</b><strong>{formatAmount(buckets[active].amount!)}</strong></div></foreignObject>}
  </svg></div>;
}
