import { useMemo, type KeyboardEvent } from "react";
import { buildPieLabelPositions, buildPieSlices } from "./pie-chart";

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
  const labelPositions = useMemo(() => buildPieLabelPositions(slices, geometry), [slices]);

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
          fill={palette[index % palette.length]}
          className="donut-slice"
          tabIndex={0}
          role="button"
          aria-label={sliceLabel(displayGroup(slice.item), formatAmount(slice.item.amount), formatPercent(slice.percentage))}
          onClick={() => onOpen(slice.item)}
          onKeyDown={(event) => handleKey(event, slice.item)}
        />)}
        {slices.map((slice, index) => {
          if (!slice.path) return null;
          const position = labelPositions[index];
          const icon = iconForGroup(slice.item);
          return position.placement === "inside"
            ? <text key={`icon-${slice.item.name}`} x={position.x} y={position.y} className="donut-icon donut-icon-inside" aria-hidden="true">{icon}</text>
            : <g key={`icon-${slice.item.name}`} className="donut-external-icon" aria-hidden="true">
                <polyline points={position.points} />
                <circle cx={position.x} cy={position.y} r="11" />
                <text x={position.x} y={position.y} className="donut-icon">{icon}</text>
              </g>;
        })}
        <text x="140" y="132" textAnchor="middle" className="donut-total-label">{totalLabel}</text>
        <text x="140" y="156" textAnchor="middle" className="donut-total-value">{formatAmount(total)}</text>
      </svg>
    </div>
    <div className="pie-legend">
      {slices.map((slice, index) => <button key={slice.item.name} onClick={() => onOpen(slice.item)}>
        <span className="legend-icon" aria-hidden="true">{iconForGroup(slice.item)}</span>
        <span className="legend-color" style={{ background: palette[index % palette.length] }} />
        <span className="legend-name"><b>{displayGroup(slice.item)}</b><small>{formatInteger(slice.item.count)} {transactionLabel}</small></span>
        <span className="legend-value"><b>{formatAmount(slice.item.amount)}</b><small>{formatPercent(slice.percentage)}</small></span>
      </button>)}
    </div>
  </section>;
}
