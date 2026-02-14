import { expect, test } from "@playwright/test";

async function openGame(page: import("@playwright/test").Page) {
  await page.goto("/d/2026-02-15");
  await page.getByRole("button", { name: "Open T-TicTac app" }).click();
  await expect(page.locator("#appWindow")).toBeVisible();
  await expect(page.locator("#grid .ttt-cell")).toHaveCount(9);
}

async function waitForPlayerTurnOrResult(page: import("@playwright/test").Page) {
  await expect
    .poll(async () => ((await page.locator("#gameStatus").textContent()) || "").trim(), {
      timeout: 5000,
    })
    .toMatch(/^(Your turn\.|Apply patch\.|X wins\.|O wins\.|Draw\.)$/);
}

async function dragResizeHandle(
  page: import("@playwright/test").Page,
  handle: "left" | "right" | "top" | "bottom" | "corner",
  dx: number,
  dy: number,
) {
  await page.evaluate(
    ({ handle, dx, dy }) => {
      const el = document.querySelector(`#appWindow [data-resize="${handle}"]`) as HTMLElement | null;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;
      const pointerId = 41;
      el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId, clientX: startX, clientY: startY }));
      el.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          pointerId,
          clientX: startX + dx,
          clientY: startY + dy,
        }),
      );
      el.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          pointerId,
          clientX: startX + dx,
          clientY: startY + dy,
        }),
      );
    },
    { handle, dx, dy },
  );
}

test("2026-02-15 new game resets board to 3x3", async ({ page }) => {
  await openGame(page);

  const rightHandle = page.locator('#appWindow [data-resize="right"]');
  const handleBox = await rightHandle.boundingBox();
  expect(handleBox).not.toBeNull();
  if (!handleBox) return;

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    handleBox.x + handleBox.width / 2 + 220,
    handleBox.y + handleBox.height / 2,
    { steps: 10 },
  );
  await page.mouse.up();

  await expect
    .poll(async () => await page.locator("#grid .ttt-cell").count(), { timeout: 3000 })
    .toBeGreaterThan(9);

  await page.getByRole("button", { name: "New Game" }).click();
  await expect(page.locator("#grid .ttt-cell")).toHaveCount(9);
});

test("2026-02-15 honors XO unlock from sessionStorage", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.sessionStorage.setItem("taeglich:2026-02-15:xo", "1"));
  await page.goto("/d/2026-02-15");
  await page.getByRole("button", { name: "Open T-TicTac app" }).click();
  await expect(page.locator("#appWindow")).toBeVisible();
  await waitForPlayerTurnOrResult(page);

  await page.locator('#grid .ttt-cell[data-mark="E"]').first().click();
  await waitForPlayerTurnOrResult(page);

  const oCell = page.locator('#grid .ttt-cell[data-mark="O"]').first();
  await expect(oCell).toBeVisible();
  const xoBefore = await page.locator('#grid .ttt-cell[data-mark="XO"]').count();
  await oCell.click({ force: true });
  await expect
    .poll(async () => await page.locator('#grid .ttt-cell[data-mark="XO"]').count(), {
      timeout: 3000,
    })
    .toBeGreaterThan(xoBefore);
  const xoAfterFirst = await page.locator('#grid .ttt-cell[data-mark="XO"]').count();

  await waitForPlayerTurnOrResult(page);
  const statusAfterFirst = ((await page.locator("#gameStatus").textContent()) || "").trim();
  if (/wins\.|Draw\./.test(statusAfterFirst)) {
    await page.getByRole("button", { name: "New Game" }).click();
    await waitForPlayerTurnOrResult(page);
    await page.locator('#grid .ttt-cell[data-mark="E"]').first().click();
    await waitForPlayerTurnOrResult(page);
  }

  const occupiedNonXo = page.locator('#grid .ttt-cell[data-mark="O"]').first();
  await expect(occupiedNonXo).toBeVisible();
  await occupiedNonXo.click({ force: true });
  await expect
    .poll(async () => await page.locator('#grid .ttt-cell[data-mark="XO"]').count(), {
      timeout: 3000,
    })
    .toBeGreaterThan(xoAfterFirst);

  expect(await page.evaluate(() => window.sessionStorage.getItem("taeglich:2026-02-15:xo"))).toBe("1");
});

test("2026-02-15 AI never yields an X win in normal play", async ({ page }) => {
  await openGame(page);

  for (let hand = 0; hand < 4; hand += 1) {
    for (let turn = 0; turn < 50; turn += 1) {
      await waitForPlayerTurnOrResult(page);
      const status = ((await page.locator("#gameStatus").textContent()) || "").trim();
      if (/wins\.|Draw\./.test(status)) {
        break;
      }

      const playable = page.locator('#grid .ttt-cell[data-mark="E"]');
      const playableCount = await playable.count();
      if (playableCount === 0) {
        await page.waitForTimeout(100);
        continue;
      }
      await playable.first().click();
    }

    await waitForPlayerTurnOrResult(page);
    await expect(page.locator("#gameStatus")).not.toHaveText("X wins.");

    if (hand < 3) {
      await page.getByRole("button", { name: "New Game" }).click();
      await expect(page.locator("#grid .ttt-cell")).toHaveCount(9);
      await waitForPlayerTurnOrResult(page);
    }
  }
});

test("2026-02-15 player XO unlock works and window shrinks on reset", async ({ page }) => {
  await openGame(page);

  const rightHandle = page.locator('#appWindow [data-resize="right"]');
  const handleBox = await rightHandle.boundingBox();
  expect(handleBox).not.toBeNull();
  if (!handleBox) return;

  const beforeResize = await page.locator("#appWindow").boundingBox();
  expect(beforeResize).not.toBeNull();
  if (!beforeResize) return;

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    handleBox.x + handleBox.width / 2 + 220,
    handleBox.y + handleBox.height / 2,
    { steps: 10 },
  );
  await page.mouse.up();

  const expanded = await page.locator("#appWindow").boundingBox();
  expect(expanded).not.toBeNull();
  if (!expanded) return;
  expect(expanded.width).toBeGreaterThan(beforeResize.width);

  await page.getByRole("button", { name: "New Game" }).click();
  await expect(page.locator("#grid .ttt-cell")).toHaveCount(9);

  await expect
    .poll(async () => {
      const box = await page.locator("#appWindow").boundingBox();
      return box?.width ?? 0;
    })
    .toBeLessThan(expanded.width);

  await page.evaluate(() => window.sessionStorage.setItem("taeglich:2026-02-15:xo", "1"));
  await page.reload();
  await page.getByRole("button", { name: "Open T-TicTac app" }).click();
  await expect(page.locator("#appWindow")).toBeVisible();
  await waitForPlayerTurnOrResult(page);

  await page.locator('#grid .ttt-cell[data-mark="E"]').first().click();
  await waitForPlayerTurnOrResult(page);

  const xCell = page.locator('#grid .ttt-cell[data-mark="X"]').first();
  await expect(xCell).toBeVisible();
  
  // Click X - should NOT turn into XO
  await xCell.click({ force: true });
  await page.waitForTimeout(300);
  expect(await page.locator('#grid .ttt-cell[data-mark="XO"]').count()).toBe(0);

  // Click O - SHOULD turn into XO
  const oCell = page.locator('#grid .ttt-cell[data-mark="O"]').first();
  await expect(oCell).toBeVisible();
  await oCell.click({ force: true });
  await expect
    .poll(async () => await page.locator('#grid .ttt-cell[data-mark="XO"]').count(), {
      timeout: 3000,
    })
    .toBeGreaterThan(0);
});

test("2026-02-15 arrow navigation works in the grid", async ({ page }) => {
  await openGame(page);

  const firstCell = page.locator('#grid .ttt-cell[data-row="0"][data-col="0"]');
  await firstCell.focus();
  await page.waitForTimeout(100);
  await expect(firstCell).toBeFocused();

  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(50);
  await expect(page.locator('#grid .ttt-cell[data-row="0"][data-col="1"]')).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(50);
  await expect(page.locator('#grid .ttt-cell[data-row="1"][data-col="1"]')).toBeFocused();

  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(50);
  await expect(page.locator('#grid .ttt-cell[data-row="1"][data-col="0"]')).toBeFocused();

  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(50);
  await expect(page.locator('#grid .ttt-cell[data-row="0"][data-col="0"]')).toBeFocused();

  // Test wrapping
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(50);
  await expect(page.locator('#grid .ttt-cell[data-row="0"][data-col="2"]')).toBeFocused();

  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(50);
  await expect(page.locator('#grid .ttt-cell[data-row="2"][data-col="2"]')).toBeFocused();
});

test("2026-02-15 resize handles work on mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openGame(page);

  await expect(page.locator("#grid .ttt-cell")).toHaveCount(9);
  await dragResizeHandle(page, "right", 180, 0);
  await expect
    .poll(async () => await page.locator("#grid .ttt-cell").count(), { timeout: 3000 })
    .toBeGreaterThan(9);
});
