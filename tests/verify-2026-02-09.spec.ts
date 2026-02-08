import { test, expect } from "@playwright/test";

test.describe("2026-02-09 status theater", () => {
  test("incident progression appears when forced", async ({ page }) => {
    await page.goto("/d/2026-02-09?monday=1&speed=fast");

    await expect(
      page.getByRole("heading", { name: "System Status", exact: true }),
    ).toBeVisible();
    await expect(page.locator("#incidentCard")).toBeVisible();

    await page.waitForFunction(() => {
      const updates = document.querySelectorAll("#updates .update");
      return updates.length >= 2;
    });

    await page.waitForFunction(() => {
      const outages = document.querySelectorAll("[data-state='outage']");
      return outages.length >= 1;
    });
  });

  test("postmortem appears when resolved is forced", async ({ page }) => {
    await page.goto("/d/2026-02-09?monday=0&demo=resolved");

    await expect(page.locator("#incidentCard")).toBeHidden();
    await expect(page.locator("#postmortemCard")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Postmortem" }),
    ).toBeVisible();
  });
});
