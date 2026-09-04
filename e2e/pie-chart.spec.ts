import { expect, test, type Page } from "@playwright/test";

const activeIcon = ".donut-active-icon";

async function moveToSlice(page: Page, index: number) {
  const slice = page.locator(".donut-slice").nth(index);
  await slice.scrollIntoViewIfNeeded();
  const point = await slice.evaluate((node) => {
    const path = node as SVGPathElement;
    const coordinates = path.getAttribute("d")?.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const [startX, startY] = coordinates;
    // The first arc endpoint follows: A radius radius rotation largeArc sweep endX endY.
    const endX = coordinates[7];
    const endY = coordinates[8];
    const toAngle = (x: number, y: number) => Math.atan2(x - 140, 140 - y);
    const start = toAngle(startX, startY);
    const sweep = (toAngle(endX, endY) - start + Math.PI * 2) % (Math.PI * 2);
    const middle = start + sweep / 2;
    const svgPoint = path.ownerSVGElement!.createSVGPoint();
    svgPoint.x = 140 + Math.sin(middle) * 75;
    svgPoint.y = 140 - Math.cos(middle) * 75;
    const screenPoint = svgPoint.matrixTransform(path.getScreenCTM()!);
    return { x: screenPoint.x, y: screenPoint.y };
  });
  await page.mouse.move(point.x, point.y);
}

async function openPieChart(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore the demo|צפייה בנתוני הדמו/ }).click();
  await page.getByRole("button", { name: /Pie chart|גרף עוגה/ }).click();
  await expect(page.locator(".donut-chart")).toBeVisible();
}

async function expectActiveIconMatchesLegend(page: Page, index: number) {
  const slices = page.locator(".donut-slice");
  const legendIcons = page.locator(".pie-legend .legend-icon");
  const expectedIcon = await legendIcons.nth(index).textContent();

  await moveToSlice(page, index);
  await expect(page.locator(activeIcon)).toHaveCount(1);
  await expect(page.locator(activeIcon)).toHaveText(expectedIcon ?? "");
  await page.waitForTimeout(250);
  await expect(page.locator(activeIcon)).toHaveCount(1);

  const position = await page.locator(activeIcon).evaluate((node) => {
    const text = node as SVGTextElement;
    const svg = text.ownerSVGElement!;
    const x = Number(text.getAttribute("x"));
    const y = Number(text.getAttribute("y"));
    const viewBox = svg.viewBox.baseVal;
    return {
      x,
      y,
      distanceFromCenter: Math.hypot(x - 140, y - 140),
      minX: viewBox.x,
      minY: viewBox.y,
      maxX: viewBox.x + viewBox.width,
      maxY: viewBox.y + viewBox.height,
    };
  });

  expect(position.x).toBeGreaterThanOrEqual(position.minX + 12);
  expect(position.y).toBeGreaterThanOrEqual(position.minY + 12);
  expect(position.x).toBeLessThanOrEqual(position.maxX - 12);
  expect(position.y).toBeLessThanOrEqual(position.maxY - 12);
  expect(position.distanceFromCenter).toBeGreaterThanOrEqual(100);
  expect(position.distanceFromCenter).toBeLessThanOrEqual(120);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("interactive-expense-explorer.language", "en");
    localStorage.setItem("my-expense-map.view-mode", "list");
  });
  await openPieChart(page);
});

test("keeps the idle chart clean and retains icons in the legend", async ({ page }) => {
  await expect(page.locator(activeIcon)).toHaveCount(0);
  await expect(page.locator(".donut-chart line, .donut-chart polyline")).toHaveCount(0);

  const slices = page.locator(".donut-slice");
  const legendIcons = page.locator(".pie-legend .legend-icon");
  await expect(slices).not.toHaveCount(0);
  await expect(legendIcons).toHaveCount(await slices.count());
  for (let index = 0; index < await legendIcons.count(); index += 1) {
    await expect(legendIcons.nth(index)).not.toHaveText("");
  }
});

test("shows one nearby icon for both the largest and smallest slices, then hides it", async ({ page }) => {
  const slices = page.locator(".donut-slice");
  await expectActiveIconMatchesLegend(page, 0);

  await page.locator(".donut-card").hover({ position: { x: 5, y: 5 } });
  await expect(page.locator(activeIcon)).toHaveCount(0);

  await expectActiveIconMatchesLegend(page, (await slices.count()) - 1);
  await page.locator(".donut-card").hover({ position: { x: 5, y: 5 } });
  await expect(page.locator(activeIcon)).toHaveCount(0);
});

test("shows the correct icon on keyboard focus and hides it on blur", async ({ page }) => {
  const slices = page.locator(".donut-slice");
  const target = slices.nth(1);
  const expectedIcon = await page.locator(".pie-legend .legend-icon").nth(1).textContent();

  await target.focus();
  await expect(page.locator(activeIcon)).toHaveCount(1);
  await expect(page.locator(activeIcon)).toHaveText(expectedIcon ?? "");
  await target.evaluate((node) => (node as SVGElement).blur());
  await expect(page.locator(activeIcon)).toHaveCount(0);
});

for (const activation of ["click", "Enter", "Space"] as const) {
  test(`${activation} still opens the selected slice`, async ({ page }) => {
    const slice = page.locator(".donut-slice").first();
    const category = await page.locator(".pie-legend .legend-name b").first().textContent();

    if (activation === "click") {
      await moveToSlice(page, 0);
      await page.mouse.down();
      await page.mouse.up();
    }
    else {
      await slice.focus();
      await slice.press(activation);
    }

    await expect(page.getByRole("heading", { level: 1, name: category })).toBeVisible();
  });
}
