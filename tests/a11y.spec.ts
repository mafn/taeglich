import { test, expect } from "@playwright/test";

test.describe("Accessibility & SEO", () => {
  test("Artifacts have <noscript> fallback", async ({ browser }) => {
    // We need a new context with JS disabled to test noscript
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    // 2026-01-30 Sudoku
    await page.goto("/d/2026-01-30");
    const sudokuNoscript = await page.locator("noscript").innerHTML();
    expect(sudokuNoscript).toContain(
      "JavaScript is required to play the interactive version",
    );

    // 2026-01-31 Terminal
    await page.goto("/d/2026-01-31");
    const termNoscript = await page.locator("noscript").innerHTML();
    expect(termNoscript).toContain(
      "JavaScript is required to run the simulation",
    );

    await context.close();
  });

  test("Pages have exactly one visible h1", async ({ page }) => {
    const pagesToCheck = ["/about", "/archive", "/404"];

    for (const path of pagesToCheck) {
      await page.goto(path);
      const h1s = page.locator("h1:not(.sr-only)");
      await expect(h1s, `Page ${path} should have 1 visible h1`).toHaveCount(1);

      const hiddenH1 = page.locator("h1.sr-only");
      await expect(
        hiddenH1,
        `Page ${path} should not have sr-only h1`,
      ).toHaveCount(0);
    }
  });

  test("Today page has one visible h1 (static check)", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto("/today");
    const h1s = page.locator("h1:not(.sr-only)");
    await expect(h1s).toHaveCount(1);
    await expect(h1s).toHaveText("Redirecting…");

    const hiddenH1 = page.locator("h1.sr-only");
    await expect(hiddenH1).toHaveCount(0);

    await context.close();
  });
});
