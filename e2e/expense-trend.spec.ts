import { expect, test, type Page } from "@playwright/test";

async function enterFirstDomain(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the demo" }).click();
  const row = page.locator(".expense-row").first();
  await row.dblclick();
  await expect(page.getByRole("button", { name: "View over time" })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("interactive-expense-explorer.language", "en");
    localStorage.setItem("my-expense-map.view-mode", "list");
  });
});

test("is opt-in, expands inline, switches all granularities, and closes", async ({ page }) => {
  await enterFirstDomain(page);
  await expect(page.locator(".trend-panel")).toHaveCount(0);
  await page.getByRole("button", { name: "View over time" }).click();
  await expect(page.locator(".trend-panel")).toBeVisible();
  const select = page.locator(".trend-heading select");
  for (const value of ["twoMonths", "quarter", "halfYear", "year", "month"]) {
    await select.selectOption(value);
    await expect(select).toHaveValue(value);
    await expect(page.locator("[data-testid=trend-point]").first()).toBeVisible();
  }
  await page.getByRole("button", { name: "Hide time trend" }).click();
  await expect(page.locator(".trend-panel")).toHaveCount(0);
});

test("exposes exact point values to hover/focus and delays dismissal", async ({ page }) => {
  await enterFirstDomain(page);
  await page.getByRole("button", { name: "View over time" }).click();
  const point = page.locator("[data-testid=trend-point]").first();
  const expected = await point.getAttribute("aria-label");
  await point.hover();
  await expect(page.getByRole("tooltip")).toBeVisible();
  expect(expected).toContain(await page.getByRole("tooltip").locator("strong").innerText());
  await page.mouse.move(1, 1);
  await page.waitForTimeout(500);
  await expect(page.getByRole("tooltip")).toBeVisible();
  await expect(page.getByRole("tooltip")).toBeHidden({ timeout: 1300 });
  await point.focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
});

test("breaks the line at missing months and never invents points", async ({ page }) => {
  await enterFirstDomain(page);
  await page.getByRole("button", { name: "View over time" }).click();
  const points = page.locator("[data-testid=trend-point]");
  const segments = page.locator("[data-testid=trend-segment]");
  expect(await points.count()).toBeGreaterThan(0);
  expect(await segments.count()).toBeGreaterThan(1);
  expect(await page.locator("[data-testid=trend-point][data-value='0']").count()).toBe(0);
});

test("clears tooltip and replaces scoped values when navigating", async ({ page }) => {
  await enterFirstDomain(page);
  await page.getByRole("button", { name: "View over time" }).click();
  const oldScope = await page.locator(".trend-disclosure").getAttribute("data-scope");
  const point = page.locator("[data-testid=trend-point]").first();
  await point.focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.locator(".expense-row").first().dblclick();
  const newScope = await page.locator(".trend-disclosure").getAttribute("data-scope");
  expect(newScope).not.toBe(oldScope);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
});

test("uses keyboard controls and makes no financial-data network request", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => { if (request.method() !== "GET") requests.push(request.url()); });
  await enterFirstDomain(page);
  const toggle = page.getByRole("button", { name: "View over time" });
  await toggle.focus(); await toggle.press("Enter");
  await page.locator("[data-testid=trend-point]").first().focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  expect(requests).toEqual([]);
});

test("print visibility follows the disclosure state", async ({ page }) => {
  await enterFirstDomain(page);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".trend-disclosure")).toBeHidden();
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("button", { name: "View over time" }).click();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".trend-panel")).toBeVisible();
});

test("shows the localized trend control and chart in Hebrew", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Language" }).selectOption("he");
  await page.getByRole("button", { name: "צפייה בנתוני הדמו" }).click();
  await page.locator(".expense-row").first().press("Enter");

  const toggle = page.getByRole("button", { name: "הצג לאורך זמן" });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.locator(".trend-panel")).toBeVisible();
  await expect(page.locator("[data-testid=trend-point]").first()).toBeVisible();
});

for (const language of ["en", "he"] as const) {
  test(`shows every Health and Insurance subsection as a separate localized series in ${language}`, async ({ page }) => {
    await page.goto("/");
    await page.getByRole("combobox", { name: "Language" }).selectOption(language);
    await page.getByRole("button", { name: language === "he" ? "צפייה בנתוני הדמו" : "Explore the demo" }).click();
    const healthLabel = language === "he" ? "בריאות וביטוח" : "Health & insurance";
    await page.getByRole("button", { name: new RegExp(healthLabel) }).press("Enter");
    await page.locator(".view-toggle button").nth(1).click();
    await page.getByRole("button", { name: language === "he" ? "הצג לאורך זמן" : "View over time" }).click();

    await expect(page.locator("[data-testid=trend-series]")).toHaveCount(2);
    const expectedLabels = language === "he" ? ["בריאות ותרופות", "ביטוחים"] : ["Health & medication", "Insurance"];
    for (const label of expectedLabels) await expect(page.locator(".trend-legend")).toContainText(label);
    const strokes = await page.locator("[data-testid=trend-series] polyline").evaluateAll((lines) => [...new Set(lines.map((line) => line.getAttribute("stroke")))]);
    expect(strokes).toHaveLength(2);
    const pieColors = await page.locator(".pie-legend .legend-color").evaluateAll((items) => items.map((item) => getComputedStyle(item).backgroundColor));
    const trendColors = await page.locator("[data-testid=trend-series]").evaluateAll((items) => items.map((item) => getComputedStyle(item.querySelector("polyline")!).stroke));
    expect(trendColors).toEqual(pieColors);
  });
}
