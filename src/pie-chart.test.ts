import { describe, expect, it } from "vitest";
import { buildPieSlices, createDonutPath } from "./pie-chart";

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
});
