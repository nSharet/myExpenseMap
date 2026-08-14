import { useMemo, type KeyboardEvent } from "react";
import { buildPieSlices } from "./pie-chart";

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
  onOpen: (group: PieGroup) => void;
};

export default function PieChartView({ groups, palette, title, totalLabel, total, displayGroup, formatAmount, formatInteger, formatPercent, transactionLabel, sliceLabel, onOpen }: Props) {
  const slices = useMemo(() => buildPieSlices(groups, (group) => group.amount), [groups]);

  function handleKey(event: KeyboardEvent, group: PieGroup) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpen(group);
  }

  return <section className="pie-view">
    <div className="donut-card">
      <svg className="donut-chart" viewBox="0 0 240 240" role="img" aria-label={title}>
        <title>{title}</title>
        {slices.map((slice, index) => slice.path && <path
          key={slice.item.name}
          d={slice.path}
          fill={palette[index % palette.length]}
          className="donut-slice"
          tabIndex={0}
          role="button"
          aria-label={sliceLabel(displayGroup(slice.item), formatAmount(slice.item.amount), formatPercent(slice.percentage))}
          onClick={() => onOpen(slice.item)}
          onKeyDown={(event) => handleKey(event, slice.item)}
        />)}
        <text x="120" y="112" textAnchor="middle" className="donut-total-label">{totalLabel}</text>
        <text x="120" y="136" textAnchor="middle" className="donut-total-value">{formatAmount(total)}</text>
      </svg>
    </div>
    <div className="pie-legend">
      {slices.map((slice, index) => <button key={slice.item.name} onClick={() => onOpen(slice.item)}>
        <span className="legend-color" style={{ background: palette[index % palette.length] }} />
        <span className="legend-name"><b>{displayGroup(slice.item)}</b><small>{formatInteger(slice.item.count)} {transactionLabel}</small></span>
        <span className="legend-value"><b>{formatAmount(slice.item.amount)}</b><small>{formatPercent(slice.percentage)}</small></span>
      </button>)}
    </div>
  </section>;
}
