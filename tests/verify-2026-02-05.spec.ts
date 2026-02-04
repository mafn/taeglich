import { test, expect } from "@playwright/test";

test("2026-02-05 Artifact loads and renders core elements", async ({
  page,
  browser,
}) => {
  // Check Title
  await page.goto("/d/2026-02-05");
  await expect(page).toHaveTitle(/zen circle/);

  // Check SVG circle
  const circle = page.locator(".zen-circle");
  await expect(circle).toBeVisible();

  // Check instructions text
  const instructions = page.locator(".instructions");
  await expect(instructions).toBeVisible();
  await expect(instructions).toContainText("Breathe in.");
  await expect(instructions).toContainText("Breathe out.");

  // Check audio toggle
  const toggle = page.locator("#audioToggle");
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveText(/Sound:\s*off/i);
  await expect(toggle).toHaveAttribute("aria-pressed", "false");

  // Toggle audio
  await toggle.click();
  await expect(toggle).toHaveText(/Sound:\s*on/i);
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  // Toggle back
  await toggle.click();
  await expect(toggle).toHaveText(/Sound:\s*off/i);
  await expect(toggle).toHaveAttribute("aria-pressed", "false");

  // Check no-JS still renders the artifact
  const context = await browser.newContext({ javaScriptEnabled: false });
  const noJsPage = await context.newPage();
  await noJsPage.goto("/d/2026-02-05");
  await expect(noJsPage.locator(".zen-circle")).toBeVisible();
  await expect(noJsPage.locator(".instructions")).toBeVisible();
  await context.close();
});
