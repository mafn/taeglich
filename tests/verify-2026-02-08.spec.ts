import { test, expect } from "@playwright/test";

test("2026-02-08 requires breaking glass before push", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem("taeglich:completed:2026-02-08");
  });

  await page.goto("/d/2026-02-08");

  await expect(page).toHaveTitle(/break glass/i);

  const goodnight = page.getByTestId("goodnight");
  await expect(goodnight).toHaveCSS("opacity", "0");

  const pushHit = page.getByTestId("hit-push");
  await expect(pushHit).toBeHidden();

  await expect(page.locator("#sleep-toggle")).toBeDisabled();

  const storedBefore = await page.evaluate(() =>
    localStorage.getItem("taeglich:completed:2026-02-08"),
  );
  expect(storedBefore).toBeNull();

  await page.getByTestId("hit-glass").click();
  await expect(page.locator(".cracks")).toHaveCSS("opacity", "1");
  await expect(page.locator("#sleep-toggle")).toBeEnabled();

  await expect(pushHit).toBeVisible();
  await pushHit.click();
  await expect(goodnight).toHaveCSS("opacity", "1");

  const storedAfter = await page.evaluate(() =>
    localStorage.getItem("taeglich:completed:2026-02-08"),
  );
  expect(storedAfter).toBe("1");
});
