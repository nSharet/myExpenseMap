import { describe, expect, it } from "vitest";
import { buildPieLabelPositions, buildPieSlices, createDonutPath } from "./pie-chart";

describe("pie chart geometry", () => {
  it("creates proportional, contiguous slices", () => {
    const slices = buildPieSlices([{ value: 60 }, { value: 30 }, { value: 10 }], (item) => item.value);
    expect(slices.map((slice) => slice.percentage)).toEqual([0.6, 0.3, 0.1]);
    expect(slices[0].startAngle).toBe(0);
    expect(slices[0].endAngle).toBeCloseTo(slices[1].startAngle);
    expect(slices[2].endAngle).toBeCloseTo(Math.PI * 2);
    expect(slices.every((slice) => slice.path.startsWith("M "))).toBe(true);
  });

  it("keeps zero and negative groups accessible without invalid slices", () => {
    const slices = buildPieSlices([{ value: 50 }, { value: 0 }, { value: -20 }], (item) => item.value);
    expect(slices.map((slice) => slice.percentage)).toEqual([1, 0, 0]);
    expect(slices[0].path).toContain("A 96 96");
    expect(slices[1].path).toBe("");
    expect(slices[2].path).toBe("");
  });

  it("returns no geometry for invalid or empty arcs", () => {
    expect(createDonutPath(1, 1)).toBe("");
    expect(createDonutPath(0, Math.PI, 40, 40)).toBe("");
  });

  it("places large-slice icons inside and separates small external labels", () => {
    const geometry = { center: 140, outerRadius: 96, innerRadius: 54 };
    const slices = buildPieSlices([{ value: 72 }, { value: 7 }, { value: 7 }, { value: 7 }, { value: 7 }], (item) => item.value, geometry);
    const positions = buildPieLabelPositions(slices, geometry);
    expect(positions[0].placement).toBe("inside");
    expect(positions.slice(1).every((position) => position.placement === "outside" && position.points)).toBe(true);
    expect(positions.every((position) => Number.isFinite(position.x) && Number.isFinite(position.y))).toBe(true);

    const bySide = [-1, 1].map((side) => positions
      .filter((position) => position.placement === "outside" && Math.sign(position.x - geometry.center) === side)
      .sort((a, b) => a.y - b.y));
    bySide.forEach((side) => side.slice(1).forEach((position, index) => {
      expect(position.y - side[index].y).toBeGreaterThanOrEqual(24);
    }));
  });
});
