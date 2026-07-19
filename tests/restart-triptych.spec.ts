import { expect, test } from "@playwright/test";

const routes = ["/d/2026-07-20", "/d/2026-07-21", "/d/2026-07-22"];
const artifactSelectors = [".composition", ".receipt", ".console"];

test.describe("restart triptych", () => {
  for (const [index, route] of routes.entries()) {
    test(`${route} keeps one heading, one main landmark, and no horizontal overflow`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(route);

      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("main")).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        `https://taegli.ch${route}`,
      );

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(
        dimensions.clientWidth,
      );

      const artifactBounds = await page
        .locator(artifactSelectors[index])
        .boundingBox();
      expect(artifactBounds).not.toBeNull();
      expect(artifactBounds!.x).toBeGreaterThanOrEqual(-0.5);
      expect(artifactBounds!.x + artifactBounds!.width).toBeLessThanOrEqual(
        320.5,
      );
    });
  }

  test("July 13 renders 140 empty days and one present day", async ({
    page,
  }) => {
    await page.goto(routes[0]);

    await expect(page.locator(".field")).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(".day")).toHaveCount(141);
    await expect(page.locator(".day.present")).toHaveCount(1);
    await expect(
      page.getByText("Nothing is owed to the empty days."),
    ).toBeVisible();
    await expect(page.getByText("2026-07-20 · present")).toBeVisible();
    await expect(page.locator("article > .composition > footer")).toBeVisible();
    await expect(page.locator("body > footer")).toBeHidden();
  });

  test("July 14 keeps the fictional receipt and tax arithmetic intact", async ({
    page,
  }) => {
    await page.goto(routes[1]);

    await expect(page.locator(".counter")).toHaveAttribute("lang", "de");
    await expect(page.getByText("00000 Nirgendwo")).toBeVisible();
    await expect(page.getByText("PFLICHTTRINKGELD A")).toBeVisible();
    await expect(page.getByText("94,44 EUR")).toBeVisible();
    await expect(page.getByText("*** TSE-AUSFALL ***")).toBeVisible();
    await expect(page.getByText("82,70")).toBeVisible();
    await expect(page.getByText("11,74")).toBeVisible();
    await expect(page.getByText("D 5,5%")).toBeVisible();
    await expect(page.getByText("E 7,8%")).toBeVisible();
  });

  test("July 15 switches on with native keyboard interaction", async ({
    page,
  }) => {
    await page.goto(routes[2]);

    const button = page.locator(".power-button");
    await expect(button).toHaveAccessibleName("Switch taegli.ch on");
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText("The signal is live.")).toBeHidden();
    const linksBefore = await page
      .locator(".console > .site-links")
      .boundingBox();

    await button.focus();
    await expect(button).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(button).toHaveAccessibleName("Switch taegli.ch to standby");
    await expect(page.locator(".power-room")).toHaveAttribute(
      "data-state",
      "on",
    );
    await expect(page.locator(".state")).toHaveText("ON");
    const signal = page.getByText("The signal is live.");
    await expect(signal).toBeVisible();
    const linksAfter = await page
      .locator(".console > .site-links")
      .boundingBox();
    expect(linksAfter?.y).toBe(linksBefore?.y);
  });

  test("July 15 preserves the standby distinction in forced colors", async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto(routes[2]);

    const signal = page.getByText("The signal is live.");
    await expect(signal).toBeHidden();
    await page.locator(".power-button").click();
    await expect(signal).toBeVisible();
  });

  test("July 14 keeps its receipt legible in forced colors", async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto(routes[1]);

    await expect(page.locator(".receipt-inner")).toHaveCSS(
      "border-top-style",
      "solid",
    );
    await expect(page.locator(".fine-print")).toHaveCSS("opacity", "1");
    const scanlineDisplay = await page
      .locator(".receipt-inner")
      .evaluate((receipt) => getComputedStyle(receipt, "::after").display);
    expect(scanlineDisplay).toBe("none");
  });
});
