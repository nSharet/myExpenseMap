import { useMemo, useState, type KeyboardEvent } from "react";
import { buildPieActiveIconPosition, buildPieSlices } from "./pie-chart";

type PieGroup = { name: string; amount: number; count: number };

type Props = {
  groups: PieGroup[];
  palette: string[];
  title: string;
  totalLabel: string;
  total: number;
  displayGroup: (group: PieGroup) => string;
  formatAmount: (amount: number) => string;
  formatInteger: (value: number) => string;
  formatPercent: (value: number) => string;
  transactionLabel: string;
  sliceLabel: (name: string, amount: string, percent: string) => string;
  iconForGroup: (group: PieGroup) => string;
  onOpen: (group: PieGroup) => void;
};

const geometry = { center: 140, outerRadius: 96, innerRadius: 54 };

export default function PieChartView({ groups, palette, title, totalLabel, total, displayGroup, formatAmount, formatInteger, formatPercent, transactionLabel, sliceLabel, iconForGroup, onOpen }: Props) {
  const slices = useMemo(() => buildPieSlices(groups, (group) => group.amount, geometry), [groups]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const activeIndex = hoveredIndex ?? focusedIndex;
  const activeSlice = activeIndex === null ? null : slices[activeIndex];
  const activeIconPosition = activeSlice?.path ? buildPieActiveIconPosition(activeSlice, geometry) : null;

  function handleKey(event: KeyboardEvent, group: PieGroup) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpen(group);
  }

  return <section className="pie-view">
    <div className="donut-card">
      <svg className="donut-chart" viewBox="0 0 280 280" role="img" aria-label={title}>
        <title>{title}</title>
        {slices.map((slice, index) => slice.path && <path
          key={slice.item.name}
          d={slice.path}
          fill={slice.item.amount < 0 ? "#0aaf82" : palette[index % palette.length]}
          className={`donut-slice${slice.item.amount < 0 ? " donut-slice-credit" : ""}`}
          data-credit={slice.item.amount < 0 ? "true" : undefined}
          tabIndex={0}
          role="button"
          aria-label={sliceLabel(displayGroup(slice.item), formatAmount(slice.item.amount), formatPercent(total === 0 ? 0 : slice.item.amount / Math.abs(total)))}
          onClick={() => onOpen(slice.item)}
          onKeyDown={(event) => handleKey(event, slice.item)}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() => setFocusedIndex(null)}
        />)}
        {activeSlice && activeIconPosition && <text
          x={activeIconPosition.x}
          y={activeIconPosition.y}
          className="donut-active-icon"
          aria-hidden="true"
        >{iconForGroup(activeSlice.item)}</text>}
        <text x="140" y="132" textAnchor="middle" className="donut-total-label">{totalLabel}</text>
        <text x="140" y="156" textAnchor="middle" className="donut-total-value">{formatAmount(total)}</text>
      </svg>
    </div>
    <div className="pie-legend">
      {slices.map((slice, index) => <button key={slice.item.name} className={slice.item.amount < 0 ? "credit-group" : undefined} onClick={() => onOpen(slice.item)}>
        <span className="legend-icon" aria-hidden="true">{iconForGroup(slice.item)}</span>
        <span className="legend-color" style={{ background: slice.item.amount < 0 ? "#0aaf82" : palette[index % palette.length] }} />
        <span className="legend-name"><b>{displayGroup(slice.item)}</b><small>{formatInteger(slice.item.count)} {transactionLabel}</small></span>
        <span className="legend-value"><b>{formatAmount(slice.item.amount)}</b><small>{formatPercent(total === 0 ? 0 : slice.item.amount / Math.abs(total))}</small></span>
      </button>)}
    </div>
  </section>;
}
