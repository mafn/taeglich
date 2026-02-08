import { test, expect } from "@playwright/test";

test.describe("2026-02-09 historical view", () => {
  test("shows postmortem on a non-Monday", async ({ page }) => {
    // Force resolved state to show postmortem regardless of today's date
    await page.goto("/d/2026-02-09?monday=0&demo=resolved");

    await expect(page.locator("#incidentCard")).toBeHidden();
    await expect(page.locator("#postmortemCard")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Postmortem" }),
    ).toBeVisible();

    // Check for some postmortem content
    await expect(page.getByText("Root Cause")).toBeVisible();
    await expect(page.getByText("Corrective Actions")).toBeVisible();
  });
});
