import { test, expect } from "@playwright/test";

test("2026-02-06 Artifact renders and tracks completion", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("taeglich:completed:2026-02-06", "1");
  });

  await page.goto("/d/2026-02-06");

  await expect(page).toHaveTitle(/DEVOPS MATCH/i);

  const grid = page.locator("#cardGrid");
  await expect(grid).toBeVisible();

  const cards = page.locator(".card");
  await expect(cards).toHaveCount(16);

  const first = cards.first();
  await first.click();
  await expect(first).toHaveAttribute("aria-pressed", "true");

  const saved = page.locator("#savedBadge");
  await expect(saved).toBeVisible();
});
