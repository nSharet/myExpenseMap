import { useEffect, useMemo, useRef, useState } from "react";
import { aggregateExpensesByPeriod, suggestedGranularity, trendSegments, type TrendBucket, type TrendGranularity } from "./expense-trend";
import type { EffectiveExpense } from "./types";

type Props = {
  records: EffectiveExpense[]; rangeRecords?: EffectiveExpense[]; scopeKey: string; title: string; color: string; language: "he" | "en";
  series?: TrendSeriesInput[];
  formatAmount: (value: number) => string; formatInteger: (value: number) => string;
};
export type TrendSeriesInput = { key: string; label: string; color: string; records: EffectiveExpense[] };
type ChartSeries = Omit<TrendSeriesInput, "records"> & { buckets: TrendBucket[] };
type ActivePoint = { seriesIndex: number; bucketIndex: number };
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

export default function ExpenseTrendPanel({ records, rangeRecords, scopeKey, title, color, series, language, formatAmount, formatInteger }: Props) {
  const copy = labels[language];
  const [open, setOpen] = useState(false);
  const [granularity, setGranularity] = useState<TrendGranularity>(() => suggestedGranularity(records));
  const [active, setActive] = useState<ActivePoint | null>(null);
  const closeTimer = useRef<number | null>(null);
  const chartSeries = useMemo<ChartSeries[]>(() => (series?.length ? series : [{ key: scopeKey, label: title, color, records }])
    .map((item) => ({ ...item, buckets: aggregateExpensesByPeriod(item.records, granularity, rangeRecords) }))
    .filter((item) => item.buckets.some((bucket) => bucket.amount !== null)), [series, scopeKey, title, color, records, granularity, rangeRecords]);
  useEffect(() => { setActive(null); if (closeTimer.current) window.clearTimeout(closeTimer.current); }, [scopeKey, records]);
  useEffect(() => () => { if (closeTimer.current) window.clearTimeout(closeTimer.current); }, []);
  const show = (point: ActivePoint) => { if (closeTimer.current) window.clearTimeout(closeTimer.current); setActive(point); };
  const toggle = (point: ActivePoint) => { if (closeTimer.current) window.clearTimeout(closeTimer.current); setActive((value) => value?.seriesIndex === point.seriesIndex && value.bucketIndex === point.bucketIndex ? null : point); };
  const scheduleHide = () => { if (closeTimer.current) window.clearTimeout(closeTimer.current); closeTimer.current = window.setTimeout(() => setActive(null), 1000); };
  return <section className={`trend-disclosure${open ? " is-open" : ""}`} data-scope={scopeKey}>
    <button className="trend-toggle" aria-expanded={open} aria-controls="expense-trend-panel" onClick={() => { setOpen((value) => !value); setActive(null); }}><span aria-hidden="true">↗</span>{open ? copy.hide : copy.view}</button>
    {open && <div id="expense-trend-panel" className="trend-panel">
      <div className="trend-heading"><div><p>{copy.title}</p><h2>{title}</h2></div><label><span className="sr-only">{copy.view}</span><select aria-label={copy.view} value={granularity} onChange={(event) => { setGranularity(event.target.value as TrendGranularity); setActive(null); }}>{(["month","twoMonths","quarter","halfYear","year"] as TrendGranularity[]).map((value) => <option key={value} value={value}>{copy[value]}</option>)}</select></label></div>
      {chartSeries.length ? <TrendChart series={chartSeries} language={language} formatAmount={formatAmount} formatInteger={formatInteger} active={active} show={show} toggle={toggle} scheduleHide={scheduleHide} /> : <p className="trend-empty">{copy.empty}</p>}
    </div>}
  </section>;
}

function TrendChart({ series, language, formatAmount, formatInteger, active, show, toggle, scheduleHide }: { series: ChartSeries[]; language: "he"|"en"; formatAmount:(n:number)=>string; formatInteger:(n:number)=>string; active:ActivePoint|null; show:(point:ActivePoint)=>void; toggle:(point:ActivePoint)=>void; scheduleHide:()=>void }) {
  const copy = labels[language]; const W=760,H=300,L=62,R=22,T=26,B=58;
  const buckets=series[0].buckets;
  const values=series.flatMap(item=>item.buckets.flatMap(b=>b.amount===null?[]:[b.amount])); const rawMin=Math.min(0,...values),rawMax=Math.max(0,...values);
  const min=rawMin===0&&rawMax===0?-1:rawMin,max=rawMin===0&&rawMax===0?1:rawMax,span=max-min;
  const labelStep=Math.max(1,Math.ceil(buckets.length/9));
  const x=(i:number)=>L+(buckets.length===1?(W-L-R)/2:i*(W-L-R)/(buckets.length-1)); const y=(v:number)=>T+(max-v)*(H-T-B)/span;
  const description=series.flatMap(item=>item.buckets.filter(b=>b.amount!==null).map(b=>`${item.label}, ${periodLabel(b,language)}: ${formatAmount(b.amount!)}`)).join("; ");
  const activeSeries=active===null?null:series[active.seriesIndex]; const activeBucket=activeSeries?.buckets[active!.bucketIndex];
  return <><div className="trend-legend" aria-label={language === "he" ? "מקרא" : "Legend"}>{series.map(item=><span key={item.key}><i style={{background:item.color}} />{item.label}</span>)}</div><div className="trend-chart-wrap"><svg className="trend-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="trend-chart-title trend-chart-desc">
    <title id="trend-chart-title">{copy.view}</title><desc id="trend-chart-desc">{description}</desc>
    <line className="trend-axis" x1={L} x2={W-R} y1={y(0)} y2={y(0)} />
    <text className="trend-y-label" x={L-8} y={T+5}>{formatAmount(max)}</text><text className="trend-y-label" x={L-8} y={H-B+5}>{formatAmount(min)}</text>
    {series.map((item,seriesIndex)=><g key={item.key} data-testid="trend-series" data-series={item.key}>{trendSegments(item.buckets).map((segment,i)=><polyline key={i} data-testid="trend-segment" points={segment.map(b=>`${x(item.buckets.indexOf(b))},${y(b.amount!)}`).join(" ")} fill="none" stroke={item.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />)}
    {item.buckets.map((bucket,index)=><g key={bucket.key}>
      {bucket.amount!==null && <circle data-testid="trend-point" data-series={item.key} data-period={bucket.key} data-value={bucket.amount} tabIndex={0} role="button" aria-label={`${item.label}, ${periodLabel(bucket,language)}, ${formatAmount(bucket.amount)}, ${formatInteger(bucket.count)} ${copy.transactions}${bucket.credits<0?`, ${formatAmount(bucket.credits)} ${copy.credits}`:""}`} cx={x(index)} cy={y(bucket.amount)} r={active?.seriesIndex===seriesIndex&&active.bucketIndex===index?7:5} fill={bucket.amount<0?"#0aaf82":item.color} stroke="white" strokeWidth="3" onMouseEnter={()=>show({seriesIndex,bucketIndex:index})} onMouseLeave={scheduleHide} onFocus={()=>show({seriesIndex,bucketIndex:index})} onBlur={scheduleHide} onClick={(event)=>{ if ((event.nativeEvent as PointerEvent).pointerType === "touch") toggle({seriesIndex,bucketIndex:index}); }} />}
    </g>)}</g>)}
    {buckets.map((bucket,index)=>(index%labelStep===0||index===buckets.length-1) && <text key={bucket.key} className="trend-x-label" x={x(index)} y={H-B+24}>{periodLabel(bucket,language)}</text>)}
    {active!==null && activeBucket && activeBucket.amount!==null && <foreignObject x={Math.max(L,Math.min(W-R-116,x(active.bucketIndex)-58))} y={Math.max(3,y(activeBucket.amount)-52)} width="116" height="42" onMouseEnter={()=>show(active)} onMouseLeave={scheduleHide}><div className="trend-tooltip" role="tooltip"><b>{periodLabel(activeBucket,language)}</b><strong>{formatAmount(activeBucket.amount)}</strong></div></foreignObject>}
  </svg></div></>;
}
