import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const daysDir = path.join(process.cwd(), "src", "days");
const daySlugs = fs
  .readdirSync(daysDir)
  .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry));

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 720 };
const ARCHIVE = 'a[href="/archive"], a[href="/archive/"]';
const IMPRINT = 'a[href="/imprint"], a[href="/imprint/"]';
const PRIVACY = 'a[href="/privacy"], a[href="/privacy/"]';

async function hasVisibleLink(page: Page, selector: string, minContrast = 3) {
  return await page.locator(selector).evaluateAll(
    (links, minContrast) =>
      links.some((link) => {
        if (!(link instanceof HTMLElement)) return false;
        const style = window.getComputedStyle(link);
        if (style.display === "none" || style.visibility === "hidden") {
          return false;
        }
        if (style.pointerEvents === "none") return false;
        const rect = link.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        const inViewport =
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < window.innerHeight &&
          rect.left < window.innerWidth;
        if (!inViewport) return false;

        const pointX = rect.left + rect.width / 2;
        const pointY = rect.top + rect.height / 2;
        const stack = document.elementsFromPoint(pointX, pointY);
        const topInteractive = stack.find((el) => {
          if (!(el instanceof HTMLElement)) return false;
          const s = window.getComputedStyle(el);
          if (s.display === "none" || s.visibility === "hidden") return false;
          if (s.pointerEvents === "none") return false;
          const opacity = Number(s.opacity);
          if (!Number.isNaN(opacity) && opacity < 0.05) return false;
          return true;
        });
        if (
          topInteractive &&
          !(
            link === topInteractive ||
            link.contains(topInteractive) ||
            topInteractive.contains(link)
          )
        ) {
          return false;
        }

        const parseColor = (value: string) => {
          const match = value.match(/rgba?\(([^)]+)\)/);
          if (!match) return null;
          const parts = match[1].split(",").map((p) => p.trim());
          if (parts.length < 3) return null;
          const r = Number(parts[0]);
          const g = Number(parts[1]);
          const b = Number(parts[2]);
          const a = parts.length >= 4 ? Number(parts[3]) : 1;
          if ([r, g, b, a].some((v) => Number.isNaN(v))) return null;
          return { r, g, b, a };
        };

        const blend = (fg: any, bg: any) => {
          const alpha = fg.a ?? 1;
          const inv = 1 - alpha;
          return {
            r: fg.r * alpha + bg.r * inv,
            g: fg.g * alpha + bg.g * inv,
            b: fg.b * alpha + bg.b * inv,
            a: 1,
          };
        };

        const findBackground = (el: HTMLElement) => {
          let node: HTMLElement | null = el;
          while (node) {
            const bg = parseColor(getComputedStyle(node).backgroundColor);
            if (bg && bg.a > 0.05) return bg;
            node = node.parentElement;
          }
          const bodyBg = parseColor(
            getComputedStyle(document.body).backgroundColor,
          );
          return bodyBg;
        };

        const fg = parseColor(style.color);
        let bg = findBackground(link);
        if (!fg || !bg) return true;
        if (bg.a < 1) {
          const bodyBg = parseColor(
            getComputedStyle(document.body).backgroundColor,
          );
          if (bodyBg) bg = blend(bg, bodyBg);
        }

        const toL = (v: number) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        const L1 = 0.2126 * toL(fg.r) + 0.7152 * toL(fg.g) + 0.0722 * toL(fg.b);
        const L2 = 0.2126 * toL(bg.r) + 0.7152 * toL(bg.g) + 0.0722 * toL(bg.b);
        const bright = Math.max(L1, L2);
        const dark = Math.min(L1, L2);
        const ratio = (bright + 0.05) / (dark + 0.05);
        return ratio >= minContrast;
      }),
    minContrast,
  );
}

test.describe("legal links (mobile)", () => {
  test.use({ viewport: MOBILE });

  for (const day of daySlugs) {
    test(`${day} shows archive and legal links`, async ({ page }) => {
      await page.goto(`/d/${day}`);

      await expect.poll(() => hasVisibleLink(page, ARCHIVE)).toBe(true);

      await expect.poll(() => hasVisibleLink(page, IMPRINT)).toBe(true);

      await expect.poll(() => hasVisibleLink(page, PRIVACY)).toBe(true);
    });
  }
});

test.describe("legal links (desktop)", () => {
  test.use({ viewport: DESKTOP });

  for (const day of daySlugs) {
    test(`${day} shows archive and legal links`, async ({ page }) => {
      await page.goto(`/d/${day}`);

      await expect.poll(() => hasVisibleLink(page, ARCHIVE)).toBe(true);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect.poll(() => hasVisibleLink(page, IMPRINT)).toBe(true);
      await expect.poll(() => hasVisibleLink(page, PRIVACY)).toBe(true);
    });
  }
});
