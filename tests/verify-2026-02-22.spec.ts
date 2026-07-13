import { expect, test } from "@playwright/test";

test("2026-02-22 pauses for Doppelkopf without dead ends", async ({ page }) => {
  await page.goto("/d/2026-02-22");

  await expect(page).toHaveTitle("Sorry");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(
    page.getByRole("heading", {
      name: "Sorry — I’m playing Doppelkopf for a few days.",
    }),
  ).toBeVisible();

  await expect(page.getByRole("link", { name: "Classic" })).toHaveAttribute(
    "href",
    "/doppelkopf/classic/",
  );
  await expect(page.getByRole("link", { name: "Tournament" })).toHaveAttribute(
    "href",
    "/doppelkopf/tournament/",
  );
  await expect(
    page.getByRole("link", { name: "Open Doppelkopf hub" }),
  ).toHaveAttribute("href", "/doppelkopf/");

  await expect(page.getByRole("link", { name: "archive" })).toBeVisible();
  await expect(page.getByRole("link", { name: "imprint" })).toBeVisible();
  await expect(page.getByRole("link", { name: "privacy" })).toBeVisible();
  await expect(page.locator("body > footer")).toBeHidden();
});
