import { expect, test } from "@playwright/test";

const MOBILE_PORTRAIT = { width: 390, height: 844 };
const MOBILE_LANDSCAPE = { width: 844, height: 390 };

test.describe("2026-02-10 runner", () => {
  async function holdRunKey(page: import("@playwright/test").Page, ms = 2400) {
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(ms);
    await page.keyboard.up("ArrowRight");
  }

  test("shows start screen copy", async ({ page }) => {
    await page.goto("/d/2026-02-10");
    await expect(page).toHaveTitle(/I Decided To Go Running/i);
    await expect(
      page.getByRole("heading", {
        name: "I've decided to go running instead of vibe coding",
      }),
    ).toBeVisible();
  });

  test("portrait mobile shows rotate card with legal links", async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE_PORTRAIT);
    await page.goto("/d/2026-02-10");

    await expect(
      page.getByRole("heading", { name: "Rotate your screen to play" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Archive", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Imprint", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Privacy", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start Running" }),
    ).toBeHidden();
  });

  test("landscape mobile allows play and hides rotate card", async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE_LANDSCAPE);
    await page.goto("/d/2026-02-10?demo=hazard&speed=fast");

    await expect(
      page.getByRole("heading", { name: "Rotate your screen to play" }),
    ).toBeHidden();
    await page.getByRole("button", { name: "Start Running" }).click();
    await holdRunKey(page, 2200);
    await expect(page.getByRole("heading", { name: "You lost" })).toBeVisible();
  });

  test("regular losing: hazard collision", async ({ page }) => {
    await page.goto("/d/2026-02-10?demo=hazard&speed=fast");
    await page.getByRole("button", { name: "Start Running" }).click();
    await holdRunKey(page, 2200);
    await expect(page.getByRole("heading", { name: "You lost" })).toBeVisible();
    await expect(page.locator("#endReason")).toContainText("poop");
  });

  test("regular losing: falling from track", async ({ page }) => {
    await page.goto("/d/2026-02-10?demo=fall&speed=fast");
    await page.getByRole("button", { name: "Start Running" }).click();
    await holdRunKey(page, 2100);
    await expect(page.getByRole("heading", { name: "You lost" })).toBeVisible();
    await expect(page.locator("#endReason")).toContainText("fell off");
  });

  test("regular losing: caught from behind when too slow", async ({ page }) => {
    await page.goto("/d/2026-02-10?demo=slow&speed=fast");
    await page.getByRole("button", { name: "Start Running" }).click();
    await page.waitForTimeout(2500);
    await expect(page.getByRole("heading", { name: "You lost" })).toBeVisible();
    await expect(page.locator("#endReason")).toContainText("too slow");
  });

  test("regular losing: slipping in puddle", async ({ page }) => {
    await page.goto("/d/2026-02-10?demo=slip&speed=fast");
    await page.getByRole("button", { name: "Start Running" }).click();
    await holdRunKey(page, 2200);
    await expect(page.getByRole("heading", { name: "You lost" })).toBeVisible();
    await expect(page.locator("#endReason")).toContainText("puddle");
  });

  test("finish still loses at bed", async ({ page }) => {
    await page.goto("/d/2026-02-10?demo=finish&speed=fast");
    await page.getByRole("button", { name: "Start Running" }).click();
    await holdRunKey(page, 3000);
    await expect(
      page.getByRole("heading", { name: "You've lost, good night" }),
    ).toBeVisible();
    await expect(page.locator("#endReason")).toContainText("reached the bed");
  });
});
