import { expect, test } from "@playwright/test";

test("2026-02-11 still running image links back", async ({ page }) => {
  await page.goto("/d/2026-02-11");

  await expect(page).toHaveTitle(/Still Running/i);
  await expect(page.locator("#still-title")).toBeVisible();

  const image = page.getByRole("img", {
    name: "A cartoon stick figure runs exhausted on a winding park path, sweating heavily with tongue out, under a tired-looking sun and clouds, with a discarded water bottle nearby.",
  });
  await expect(image).toBeVisible();

  const backLink = page.getByRole("link", { name: "Back to yesterday's run" });
  await expect(backLink).toHaveAttribute("href", "/d/2026-02-10");
});
