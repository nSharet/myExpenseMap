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

export type PieLabelPosition = {
  placement: "inside" | "outside";
  x: number;
  y: number;
  points?: string;
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

export function buildPieLabelPositions<T>(slices: PieSlice<T>[], geometry: PieGeometry = { center: 140, outerRadius: 96, innerRadius: 54 }, insideThreshold = 0.08): PieLabelPosition[] {
  const positions: PieLabelPosition[] = slices.map((slice) => {
    const angle = (slice.startAngle + slice.endAngle) / 2;
    if (!slice.path) return { placement: "outside", x: geometry.center, y: geometry.center };
    if (slice.percentage >= insideThreshold) {
      const radius = (geometry.innerRadius + geometry.outerRadius) / 2;
      const location = pointOnCircle(angle, radius, geometry.center);
      return { placement: "inside", x: location.x, y: location.y };
    }

    const direction = Math.cos(angle - Math.PI / 2) >= 0 ? 1 : -1;
    const start = pointOnCircle(angle, geometry.outerRadius + 1, geometry.center);
    const bend = pointOnCircle(angle, geometry.outerRadius + 13, geometry.center);
    const x = geometry.center + direction * (geometry.outerRadius + 28);
    return {
      placement: "outside",
      x,
      y: bend.y,
      points: `${point(start)}, ${point(bend)}, ${x - direction * 12} ${bend.y.toFixed(3)}`,
    };
  });

  const minimumY = 18;
  const maximumY = geometry.center * 2 - 18;
  const minimumGap = 24;

  for (const direction of [-1, 1]) {
    const indexes = positions
      .map((position, index) => ({ position, index }))
      .filter(({ position }) => position.placement === "outside" && Math.sign(position.x - geometry.center) === direction)
      .sort((a, b) => a.position.y - b.position.y);

    indexes.forEach(({ position }, index) => {
      position.y = Math.max(position.y, index === 0 ? minimumY : indexes[index - 1].position.y + minimumGap);
    });
    for (let index = indexes.length - 1; index >= 0; index -= 1) {
      const upperBound = index === indexes.length - 1 ? maximumY : indexes[index + 1].position.y - minimumGap;
      indexes[index].position.y = Math.min(indexes[index].position.y, upperBound);
    }

    indexes.forEach(({ position }) => {
      const parts = position.points?.split(", ") ?? [];
      if (parts.length === 3) position.points = `${parts[0]}, ${parts[1]}, ${parts[2].split(" ")[0]} ${position.y.toFixed(3)}`;
    });
  }

  return positions;
}
