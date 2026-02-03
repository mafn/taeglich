import { test, expect } from "@playwright/test";

test("2026-02-04 Artifact loads and has a11y support", async ({
  page,
  browser,
}) => {
  // Check Title
  await page.goto("/d/2026-02-04");
  await expect(page).toHaveTitle(/BLOCKFALL \/\/ VOID SHAPES/);

  // Check Heading (Visual)
  const visualHeading = page.locator(".game-title");
  await expect(visualHeading).toBeVisible();
  await expect(visualHeading).toHaveText("BLOCKFALL // VOID SHAPES");

  // Check Noscript (requires new context)
  const context = await browser.newContext({ javaScriptEnabled: false });
  const noJsPage = await context.newPage();
  await noJsPage.goto("/d/2026-02-04");
  const noscript = await noJsPage.locator("noscript").first().innerHTML();
  expect(noscript).toContain("This game requires JavaScript to run");
  await context.close();

  // Check Interactive Elements (with JS)
  const gameCanvas = page.locator("#gameCanvas");
  await expect(gameCanvas).toBeVisible();

  const nextPieceCanvas = page.locator("#nextPieceCanvas");
  await expect(nextPieceCanvas).toBeVisible();

  const scoreDisplay = page.locator("#score");
  await expect(scoreDisplay).toHaveText("0");
});
