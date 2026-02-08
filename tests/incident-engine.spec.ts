import { test, expect } from "@playwright/test";
import { generateTimeline } from "../src/components/status-board-engine";

test.describe("incident engine", () => {
  test("generates deterministic timeline for a given date", () => {
    const date = "2026-02-09";
    const run1 = generateTimeline(date);
    const run2 = generateTimeline(date);

    expect(run1).toEqual(run2);
    expect(run1.length).toBeGreaterThan(0);
    expect(run1[0].overall.code).toBe("LAT"); // Always starts with latency
  });

  test("generates different timelines for different dates", () => {
    const run1 = generateTimeline("2026-02-09");
    const run2 = generateTimeline("2026-02-16");

    // It's technically possible they are identical by pure chance, but highly unlikely given the seeds
    // We'll check deep equality.
    expect(run1).not.toEqual(run2);
  });
});
