import { expect, test } from "@playwright/test";

test("2026-02-16 doppelkopf is playable and accessible", async ({ page }) => {
  await page.goto("/d/2026-02-16");

  await expect(page).toHaveTitle(/Doppelkopf, Loudly/i);

  const statusLine = page.locator(".js-status");
  await expect(statusLine).toBeVisible();
  await expect(statusLine).not.toHaveText("Loading...");

  const handButtons = page.locator(".js-hand-list button");
  await expect(handButtons).toHaveCount(12);

  const firstCard = handButtons.first();
  await expect(firstCard).toBeEnabled();

  await firstCard.click();

  await expect(statusLine).toContainText(/YOUR TURN|DONE|YOURS|WINS/i);
});
