import { describe, expect, it } from "vitest";
import { getExpenseIcon } from "./category-icons";

describe("expense category icons", () => {
  it("uses stable icons for known domains and categories", () => {
    expect(getExpenseIcon("דיור והבית", "domain")).toBe("🏠");
    expect(getExpenseIcon("סופר ומכולת", "category")).toBe("🛒");
  });

  it("uses a calendar for every month", () => {
    expect(getExpenseIcon("2026-07", "month")).toBe("📅");
  });

  it("keeps user-created groups visible with a fallback icon", () => {
    expect(getExpenseIcon("קטגוריה חדשה", "category")).toBe("🧾");
  });
});
