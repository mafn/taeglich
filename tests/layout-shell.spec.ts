import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const daysDir = path.join(process.cwd(), "src", "days");
const daySlugs = fs
  .readdirSync(daysDir)
  .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry));
const publishedSlugs = daySlugs.filter((slug) =>
  fs.existsSync(path.join(daysDir, slug, "Artifact.astro")),
);

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 720 };

async function countVisible(page: Page, selector: string) {
  return await page.locator(selector).evaluateAll((els) =>
    els.reduce((count, el) => {
      if (!(el instanceof HTMLElement)) return count;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") {
        return count;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return count;
      return count + 1;
    }, 0),
  );
}

async function expectAtMostOne(page: Page, selector: string) {
  const count = await page.locator(selector).count();
  expect(count).toBeLessThanOrEqual(1);
}

async function expectSingleNavBar(page: Page) {
  const visibleHeader = await countVisible(page, "body > header");
  const visibleSiteNav = await countVisible(
    page,
    'body > nav[aria-label="Site"]',
  );
  expect(visibleHeader + visibleSiteNav).toBeLessThanOrEqual(1);
}

test.describe("layout shell", () => {
  test.describe("mobile", () => {
    test.use({ viewport: MOBILE });

    for (const day of publishedSlugs) {
      test(`${day} uses layout once (mobile)`, async ({ page }) => {
        await page.goto(`/d/${day}`);

        await expectAtMostOne(page, "body > header");
        await expectAtMostOne(page, "body > main");
        await expectAtMostOne(page, "body > footer");
        await expect(page.locator("main main")).toHaveCount(0);
        await expectAtMostOne(page, "body > nav");
        await expectAtMostOne(page, 'body > nav[aria-label="Site"]');
        await expectSingleNavBar(page);
      });
    }
  });

  test.describe("desktop", () => {
    test.use({ viewport: DESKTOP });

    for (const day of publishedSlugs) {
      test(`${day} uses layout once (desktop)`, async ({ page }) => {
        await page.goto(`/d/${day}`);

        await expectAtMostOne(page, "body > header");
        await expectAtMostOne(page, "body > main");
        await expectAtMostOne(page, "body > footer");
        await expect(page.locator("main main")).toHaveCount(0);
        await expectAtMostOne(page, "body > nav");
        await expectAtMostOne(page, 'body > nav[aria-label="Site"]');
        await expectSingleNavBar(page);
      });
    }
  });
});
