export type PieSlice<T> = {
  item: T;
  value: number;
  percentage: number;
  startAngle: number;
  endAngle: number;
  path: string;
};

export type PieGeometry = {
  center: number;
  outerRadius: number;
  innerRadius: number;
};

export type PieActiveIconPosition = {
  x: number;
  y: number;
};

type Point = { x: number; y: number };

function pointOnCircle(angle: number, radius: number, center: number): Point {
  return {
    x: center + Math.cos(angle - Math.PI / 2) * radius,
    y: center + Math.sin(angle - Math.PI / 2) * radius,
  };
}

function point(point: Point) {
  return `${point.x.toFixed(3)} ${point.y.toFixed(3)}`;
}

export function createDonutPath(startAngle: number, endAngle: number, outerRadius = 96, innerRadius = 54, center = 120) {
  const angle = endAngle - startAngle;
  if (angle <= 0 || outerRadius <= 0 || innerRadius < 0 || innerRadius >= outerRadius) return "";

  if (angle >= Math.PI * 2 - 1e-8) {
    return [
      `M ${center} ${center - outerRadius}`,
      `A ${outerRadius} ${outerRadius} 0 1 1 ${center} ${center + outerRadius}`,
      `A ${outerRadius} ${outerRadius} 0 1 1 ${center} ${center - outerRadius}`,
      `M ${center} ${center - innerRadius}`,
      `A ${innerRadius} ${innerRadius} 0 1 0 ${center} ${center + innerRadius}`,
      `A ${innerRadius} ${innerRadius} 0 1 0 ${center} ${center - innerRadius}`,
      "Z",
    ].join(" ");
  }

  const largeArc = angle > Math.PI ? 1 : 0;
  const outerStart = pointOnCircle(startAngle, outerRadius, center);
  const outerEnd = pointOnCircle(endAngle, outerRadius, center);
  const innerEnd = pointOnCircle(endAngle, innerRadius, center);
  const innerStart = pointOnCircle(startAngle, innerRadius, center);

  return [
    `M ${point(outerStart)}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${point(outerEnd)}`,
    `L ${point(innerEnd)}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${point(innerStart)}`,
    "Z",
  ].join(" ");
}

export function buildPieSlices<T>(items: T[], getValue: (item: T) => number, geometry: PieGeometry = { center: 120, outerRadius: 96, innerRadius: 54 }): PieSlice<T>[] {
  const values = items.map((item) => Math.max(0, getValue(item)));
  const total = values.reduce((sum, value) => sum + value, 0);
  let cursor = 0;

  return items.map((item, index) => {
    const value = values[index];
    const percentage = total > 0 ? value / total : 0;
    const startAngle = cursor;
    const endAngle = cursor + percentage * Math.PI * 2;
    cursor = endAngle;
    return { item, value, percentage, startAngle, endAngle, path: createDonutPath(startAngle, endAngle, geometry.outerRadius, geometry.innerRadius, geometry.center) };
  });
}

export function buildPieActiveIconPosition<T>(
  slice: PieSlice<T>,
  geometry: PieGeometry = { center: 140, outerRadius: 96, innerRadius: 54 },
  gap = 18,
  edgePadding = 12,
): PieActiveIconPosition {
  if (!slice.path) return { x: geometry.center, y: geometry.center };

  const angle = (slice.startAngle + slice.endAngle) / 2;
  const location = pointOnCircle(angle, geometry.outerRadius + gap, geometry.center);
  const viewBoxSize = geometry.center * 2;

  return {
    x: Math.min(viewBoxSize - edgePadding, Math.max(edgePadding, location.x)),
    y: Math.min(viewBoxSize - edgePadding, Math.max(edgePadding, location.y)),
  };
}
