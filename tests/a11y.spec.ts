import { test, expect } from "@playwright/test";

test.describe("Accessibility & SEO", () => {
  test("Artifacts have <noscript> fallback", async ({ browser }) => {
    // We need a new context with JS disabled to test noscript
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    // 2026-01-30 Sudoku
    await page.goto("/d/2026-01-30");
    const texts30 = await page.locator("noscript").allTextContents();
    expect(
      texts30.some((t) => t.includes("JavaScript is required to play")),
    ).toBeTruthy();

    // 2026-01-31 Terminal
    await page.goto("/d/2026-01-31");
    const texts31 = await page.locator("noscript").allTextContents();
    expect(
      texts31.some((t) => t.includes("JavaScript is required to run")),
    ).toBeTruthy();

    // 2026-02-01 Ghost Frequency
    await page.goto("/d/2026-02-01");
    const texts01 = await page.locator("noscript").allTextContents();
    expect(
      texts01.some((t) => t.includes("JavaScript is required to operate")),
    ).toBeTruthy();
    expect(texts01.some((t) => t.includes("Return to Archive"))).toBeTruthy();

    // 2026-02-02 Assignment Failed
    await page.goto("/d/2026-02-02");
    const texts02 = await page.locator("noscript").allTextContents();
    expect(
      texts02.some((t) =>
        t.includes("JavaScript is required to view the lockout overlay"),
      ),
    ).toBeTruthy();
    expect(texts02.some((t) => t.includes("Return to Archive"))).toBeTruthy();

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

  test("2026-02-02 lockout overlay appears on action attempt", async ({
    page,
  }) => {
    await page.goto("/d/2026-02-02");
    await page.click("[data-action='attempt']");
    const overlay = page.locator("#lockout-overlay");
    await expect(overlay).toBeVisible();
  });
});
