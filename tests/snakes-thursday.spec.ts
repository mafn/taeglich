import { expect, test, type Page } from "@playwright/test";

const route = "/d/2026-07-23";

type Point = { gx: number; gy: number };
type Move = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

const vectors: Array<[Move, Point]> = [
  ["ArrowUp", { gx: 0, gy: -1 }],
  ["ArrowDown", { gx: 0, gy: 1 }],
  ["ArrowLeft", { gx: -1, gy: 0 }],
  ["ArrowRight", { gx: 1, gy: 0 }],
];

function cellToPoint(cell: number): Point {
  const row = Math.floor((cell - 1) / 15);
  const offset = (cell - 1) % 15;
  return {
    gx: row % 2 === 0 ? offset : 14 - offset,
    gy: 14 - row,
  };
}

function pointToCell({ gx, gy }: Point) {
  const row = 14 - gy;
  const offset = row % 2 === 0 ? gx : 14 - gx;
  return row * 15 + offset + 1;
}

function samePoint(a: Point, b: Point) {
  return a.gx === b.gx && a.gy === b.gy;
}

function findStepPath(
  targetCell: number,
  targetRawCell: boolean,
  foodCell: number,
  warps: Map<number, number>,
) {
  const start = cellToPoint(1);
  const queue = [
    {
      body: [start, { gx: 14, gy: 14 }, { gx: 13, gy: 14 }],
      direction: { gx: 1, gy: 0 },
      path: [] as Move[],
    },
  ];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const state = queue.shift()!;
    for (const [name, vector] of vectors) {
      if (
        vector.gx === -state.direction.gx &&
        vector.gy === -state.direction.gy
      )
        continue;

      const rawPoint = {
        gx: (state.body[0].gx + vector.gx + 15) % 15,
        gy: (state.body[0].gy + vector.gy + 15) % 15,
      };
      const rawCell = pointToCell(rawPoint);
      const clearedBoard = rawCell === 225;
      const destinationCell = clearedBoard
        ? 1
        : (warps.get(rawCell) ?? rawCell);
      const destination = cellToPoint(destinationCell);
      const ateFood = destinationCell === foodCell;
      const bodyToCheck =
        ateFood || clearedBoard ? state.body : state.body.slice(0, -1);
      if (bodyToCheck.some((part) => samePoint(part, destination))) continue;

      const path = [...state.path, name];
      if (
        (targetRawCell && rawCell === targetCell) ||
        (!targetRawCell && destinationCell === targetCell)
      )
        return path;

      if (clearedBoard || ateFood) continue;
      const body = [destination, ...state.body.slice(0, -1)];
      const key = `${body.map(pointToCell).join(",")}:${vector.gx},${vector.gy}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ body, direction: vector, path });
    }
  }
  throw new Error(`No step path found to cell ${targetCell}`);
}

async function startStepGame(page: Page) {
  await page.goto(route);
  await page.getByRole("button", { name: "Step" }).click();
  await page.getByRole("button", { name: "Start game" }).first().click();

  const maps = await page.evaluate(() => {
    const parse = (selector: string) =>
      Array.from(document.querySelectorAll(`${selector} li`)).map((item) => {
        const match = item.textContent?.match(/cell (\d+) to cell (\d+)/);
        if (!match) throw new Error(`Could not parse ${item.textContent}`);
        return [Number(match[1]), Number(match[2])] as [number, number];
      });
    const foodMatch = document
      .querySelector("#food-map")
      ?.textContent?.match(/cell (\d+)/);
    if (!foodMatch) throw new Error("Could not parse food cell");
    return {
      ladders: parse("#ladder-map"),
      snakes: parse("#snake-map"),
      food: Number(foodMatch[1]),
    };
  });
  return maps;
}

async function followPath(page: Page, path: Move[]) {
  for (const move of path) await page.keyboard.press(move);
}

test.describe("Snakes & Ladders & Snakes", () => {
  test("renders as one accessible, date-bound artifact at 320px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto(route);

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText("SNAKES & LADDERS & SNAKES");
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://taegli.ch/d/2026-07-23",
    );

    const canvas = page.locator("#game-canvas");
    await expect(canvas).toHaveAttribute("role", "img");
    await expect(canvas).toHaveAccessibleDescription(
      /Arrow keys or W A S D move.*Ready/s,
    );
    await expect(
      page.getByRole("navigation", { name: "More from taeglich" }),
    ).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

    const bounds = await page.locator(".game-wrapper").boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(-0.5);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320.5);
  });

  test("does not steal Space from the semantic speed controls", async ({
    page,
  }) => {
    await page.goto(route);
    const overlay = page.locator("#game-overlay");
    const fast = page.getByRole("button", { name: "Fast" });
    const normal = page.getByRole("button", { name: "Normal" });

    await expect(page.getByRole("group", { name: "Game speed" })).toHaveCount(
      1,
    );
    await expect(fast).toHaveAttribute("aria-pressed", "true");
    await normal.focus();
    await page.keyboard.press("Space");
    await expect(normal).toHaveAttribute("aria-pressed", "true");
    await expect(fast).toHaveAttribute("aria-pressed", "false");
    await expect(overlay).toBeVisible();
  });

  test("keeps every overlay control reachable at 320px and 200% text", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 480 });
    await page.goto(route);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });

    const overlay = page.locator("#game-overlay");
    const dimensions = await overlay.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));
    expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);

    for (const name of ["Step", "Slow", "Normal", "Fast"]) {
      await expect(page.getByRole("button", { name })).toBeAttached();
    }

    const start = page.getByRole("button", { name: "Start game" }).first();
    await start.scrollIntoViewIfNeeded();
    await expect(start).toBeVisible();
    const bounds = await start.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(480);
  });

  test("builds a sparse mapped board and exposes the food cell", async ({
    page,
  }) => {
    await page.goto(route);
    await page.getByRole("button", { name: "Step" }).click();
    await page.getByRole("button", { name: "Start game" }).first().click();

    await expect(page.locator("#ladder-map li")).toHaveCount(4);
    await expect(page.locator("#snake-map li")).toHaveCount(4);
    await expect(page.locator("#ladder-map")).toContainText(
      /Ladder from cell \d+ to cell \d+/,
    );
    await expect(page.locator("#snake-map")).toContainText(
      /Snake from cell \d+ to cell \d+/,
    );
    await expect(page.locator("#food-map")).toHaveText(/Food is at cell \d+/);
    await expect(page.locator("#game-canvas")).toHaveAttribute(
      "aria-label",
      /step mode/,
    );
  });

  test("announces resulting and food cells for every Step-mode event", async ({
    page,
  }) => {
    let maps = await startStepGame(page);
    let warps = new Map([...maps.ladders, ...maps.snakes]);
    await followPath(page, findStepPath(maps.food, false, maps.food, warps));
    await expect(page.locator("#game-status")).toHaveText(
      /Food collected at cell \d+\..*New food is at cell \d+\./,
    );

    maps = await startStepGame(page);
    warps = new Map([...maps.ladders, ...maps.snakes]);
    const [ladderStart, ladderEnd] = maps.ladders[0];
    await followPath(page, findStepPath(ladderStart, true, maps.food, warps));
    await expect(page.locator("#game-status")).toHaveText(
      new RegExp(
        `Ladder from cell ${ladderStart} to cell ${ladderEnd}\\..*Current cell ${ladderEnd}\\..*food is at cell \\d+\\.`,
        "i",
      ),
    );

    maps = await startStepGame(page);
    warps = new Map([...maps.ladders, ...maps.snakes]);
    await followPath(page, findStepPath(225, true, maps.food, warps));
    await expect(page.locator("#game-status")).toHaveText(
      /Board cleared\..*Current cell 1,.*Food is at cell \d+\./,
    );
  });

  test("starts with focus on the board and exposes the running state", async ({
    page,
  }) => {
    await page.goto(route);
    await page.getByRole("button", { name: "Start game" }).first().click();

    const canvas = page.locator("#game-canvas");
    await expect(page.locator("#game-overlay")).toBeHidden();
    await expect(canvas).toBeFocused();
    await expect(canvas).toHaveAttribute("tabindex", "0");
    await expect(canvas).toHaveAttribute("aria-label", /Snake at cell \d+/);
    await expect(page.locator('[data-dir="up"]')).toBeEnabled();
    await expect(page.locator("#game-status")).toContainText("Game started");

    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(canvas).toBeFocused();
    await expect(canvas).not.toHaveCSS("outline-color", "rgba(0, 0, 0, 0)");
    await expect(canvas).toHaveCSS("box-shadow", "none");

    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(240);
    await expect(canvas).toHaveAttribute("aria-label", /with 0 points/);
  });

  test("supports sequential focus and keyboard pause, resume, and step", async ({
    page,
  }) => {
    await page.goto(route);
    await page.getByRole("button", { name: "Step" }).click();
    await page.getByRole("button", { name: "Start game" }).first().click();

    const canvas = page.locator("#game-canvas");
    const pause = page.getByRole("button", { name: "Pause" });
    await expect(canvas).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(pause).toBeFocused();

    await canvas.focus();
    const before = await canvas.getAttribute("aria-label");
    await page.keyboard.press("ArrowUp");
    await expect(canvas).not.toHaveAttribute("aria-label", before!);
    await expect(page.locator("#game-status")).toHaveText(
      /Moved to cell \d+\. Food is at cell \d+\./,
    );

    await page.keyboard.press("Space");
    await expect(
      page.getByRole("button", { name: "Resume" }),
    ).not.toHaveAttribute("aria-pressed");
    await expect(canvas).toHaveAttribute("aria-label", /paused/);
    await expect(page.locator('[data-dir="up"]')).toBeDisabled();

    await page.keyboard.press("Space");
    await expect(
      page.getByRole("button", { name: "Pause" }),
    ).not.toHaveAttribute("aria-pressed");
    await expect(page.locator('[data-dir="up"]')).toBeEnabled();
  });

  test("preserves mobile scroll position and the green shell on start", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);

    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.getByRole("button", { name: "Start game" }).first().click();
    await page.waitForTimeout(250);
    const state = await page.evaluate(() => ({
      scrollY: window.scrollY,
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      artifactBackground: getComputedStyle(
        document.querySelector("#snakes-game")!,
      ).backgroundColor,
      artifactBottom: document
        .querySelector("#snakes-game")!
        .getBoundingClientRect().bottom,
      viewportHeight: window.innerHeight,
    }));

    expect(state.scrollY).toBe(scrollBefore);
    expect(state.bodyBackground).toBe("rgb(143, 162, 14)");
    expect(state.artifactBackground).toBe("rgb(143, 162, 14)");
    expect(state.artifactBottom).toBeGreaterThanOrEqual(state.viewportHeight);
  });

  test("removes nonessential effects for reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(route);

    const animation = await page
      .locator("#cheat-toast")
      .evaluate((element) => getComputedStyle(element).animationName);
    expect(animation).toBe("none");
    await expect(page.getByRole("button", { name: "Step" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("button", { name: "Fast" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("retains semantic state in forced colors", async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto(route);

    const fast = page.getByRole("button", { name: "Fast" });
    await expect(fast).toHaveAttribute("aria-pressed", "true");
    await fast.focus();
    await expect(fast).toBeFocused();
    await expect(page.locator(".game-container")).toHaveCSS(
      "forced-color-adjust",
      "auto",
    );
    await expect(page.locator("#game-canvas")).toHaveAttribute(
      "data-palette-mode",
      "forced",
    );
    const palette = await page.locator("#game-canvas").evaluate((canvas) => ({
      background: (canvas as HTMLCanvasElement).dataset.backgroundColor,
      ink: (canvas as HTMLCanvasElement).dataset.inkColor,
    }));
    expect(palette.background).not.toBe(palette.ink);
  });

  test("provides a static fallback without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(route);

    const fallback = await page.locator("noscript").allTextContents();
    expect(
      fallback.some((text) =>
        text.includes("JavaScript is required to play this game."),
      ),
    ).toBe(true);
    await expect(page.locator("h1")).toHaveCount(1);
    await context.close();
  });
});
