import { describe, expect, it } from "vitest";
import { buildPieActiveIconPosition, buildPieSlices, createDonutPath } from "./pie-chart";

describe("pie chart geometry", () => {
  it("creates proportional, contiguous slices", () => {
    const slices = buildPieSlices([{ value: 60 }, { value: 30 }, { value: 10 }], (item) => item.value);
    expect(slices.map((slice) => slice.percentage)).toEqual([0.6, 0.3, 0.1]);
    expect(slices[0].startAngle).toBe(0);
    expect(slices[0].endAngle).toBeCloseTo(slices[1].startAngle);
    expect(slices[2].endAngle).toBeCloseTo(Math.PI * 2);
    expect(slices.every((slice) => slice.path.startsWith("M "))).toBe(true);
  });

  it("keeps zero groups empty and renders credits by magnitude", () => {
    const slices = buildPieSlices([{ value: 50 }, { value: 0 }, { value: -20 }], (item) => item.value);
    expect(slices.map((slice) => slice.percentage)).toEqual([50 / 70, 0, 20 / 70]);
    expect(slices[1].path).toBe("");
    expect(slices[0].path).toContain("A 96 96");
    expect(slices[2].path).toContain("A 96 96");
  });

  it("returns no geometry for invalid or empty arcs", () => {
    expect(createDonutPath(1, 1)).toBe("");
    expect(createDonutPath(0, Math.PI, 40, 40)).toBe("");
  });

  it("positions an active icon beside the midpoint of any slice", () => {
    const geometry = { center: 140, outerRadius: 96, innerRadius: 54 };
    const slices = buildPieSlices([{ value: 99 }, { value: 1 }], (item) => item.value, geometry);
    const largePosition = buildPieActiveIconPosition(slices[0], geometry);
    const smallPosition = buildPieActiveIconPosition(slices[1], geometry);

    expect(largePosition.x).toBeCloseTo(143.58, 1);
    expect(largePosition.y).toBeCloseTo(253.94, 1);
    expect(smallPosition.x).toBeCloseTo(136.42, 1);
    expect(smallPosition.y).toBeCloseTo(26.06, 1);
  });

  it("keeps active icons inside the chart view box", () => {
    const geometry = { center: 140, outerRadius: 130, innerRadius: 54 };
    const [slice] = buildPieSlices([{ value: 1 }], (item) => item.value, geometry);
    const position = buildPieActiveIconPosition(slice, geometry, 40, 12);

    expect(position.x).toBeGreaterThanOrEqual(12);
    expect(position.x).toBeLessThanOrEqual(268);
    expect(position.y).toBeGreaterThanOrEqual(12);
    expect(position.y).toBeLessThanOrEqual(268);
  });

  it("uses credit magnitude for geometry without changing the signed item", () => {
    const items = [{ amount: 3000 }, { amount: -100 }];
    const slices = buildPieSlices(items, (item) => item.amount);

    expect(slices[0].percentage).toBeCloseTo(3000 / 3100);
    expect(slices[1].percentage).toBeCloseTo(100 / 3100);
    expect(slices[1].item.amount).toBe(-100);
    expect(slices[1].path).not.toBe("");
  });
});
