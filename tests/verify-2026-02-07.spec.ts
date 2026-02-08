import { test, expect } from "@playwright/test";

test("2026-02-07 Liveness probe artifact works", async ({ page }) => {
  await page.goto("/d/2026-02-07");

  // Check title
  await expect(page).toHaveTitle(/Liveness probe/i);

  // Check if pod name is visible
  const podName = page.locator("#podName");
  await expect(podName).toContainText("taeglich-web-");

  // Should be enabled immediately for STARTUP
  const okBtn = page.locator("#okBtn");
  await expect(okBtn).toBeEnabled();
  await expect(page.locator("#probeType")).toHaveText("STARTUP");

  // Success 1 time for startup
  await okBtn.click();

  // Should transition to RUNNING
  const status = page.locator("#status");
  await expect(status).toHaveText("RUNNING");
});

test("2026-02-07 Startup failure threshold triggers restart", async ({
  page,
}) => {
  await page.goto("/d/2026-02-07");

  test.setTimeout(25000);

  const restarts = page.locator("#restarts");
  await expect(restarts).toHaveText("0");

  // Wait for 3 startup failures (3x3s) + retries (2x1s) + restart delay (2s)
  await expect(restarts).toHaveText("1", { timeout: 20000 });
});
