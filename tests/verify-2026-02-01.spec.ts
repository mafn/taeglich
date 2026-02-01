import { test, expect } from "@playwright/test";

test("2026-02-01 Artifact loads and has a11y support", async ({
  page,
  browser,
}) => {
  // Check Title
  await page.goto("/d/2026-02-01");
  await expect(page).toHaveTitle(/Ghost Frequency/);

  // Check Noscript (requires new context)
  const context = await browser.newContext({ javaScriptEnabled: false });
  const noJsPage = await context.newPage();
  await noJsPage.goto("/d/2026-02-01");
  const noscript = await noJsPage.locator("noscript").first().innerHTML();
  expect(noscript).toContain("JavaScript is required to operate the tuner");
  await context.close();

  // Check Interactive Elements (with JS)
  // We click the warning overlay first to make elements non-inert
  await page.click("#enter-btn");

  const knobCoarse = page.locator("#knob-coarse");
  await expect(knobCoarse).toBeVisible();
  await expect(knobCoarse).toHaveAttribute("role", "slider");
  await expect(knobCoarse).toHaveAttribute(
    "aria-label",
    "Frequency Tuner Dial",
  );

  // Check initial Frequency Display (default is 1.42)
  const display = page.locator("#freq-display");
  await expect(display).toHaveText("1.42");
});
