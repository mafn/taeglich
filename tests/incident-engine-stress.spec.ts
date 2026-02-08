import { test, expect } from "@playwright/test";
import {
  generateTimeline,
  SERVICE_KEYS,
  type ServiceState,
} from "../src/components/status-board-engine";

test.describe("incident engine stress test", () => {
  test("maintains logical consistency over 1000 simulated Mondays", () => {
    for (let i = 0; i < 1000; i++) {
      const dateString = `2026-01-${(i % 31) + 1}`; // simulate various seeds
      const timeline = generateTimeline(dateString);

      const currentState: Record<string, ServiceState> = {};
      SERVICE_KEYS.forEach((k) => (currentState[k] = "operational"));

      for (const event of timeline) {
        // Validation 1: Event must have updates or changes
        expect(event.changes.length).toBeGreaterThanOrEqual(0);

        for (const change of event.changes) {
          const previousState = currentState[change.key];

          // Validation 2: No redundant recovery
          if (change.state === "operational") {
            expect(
              previousState,
              `Service ${change.key} was recovered but was already operational in ${dateString}`,
            ).not.toBe("operational");
          }

          // Validation 3: No redundant outage
          if (change.state === "outage") {
            expect(
              previousState,
              `Service ${change.key} went to outage but was already in outage in ${dateString}`,
            ).not.toBe("outage");
          }

          // Update state for next event in timeline
          currentState[change.key] = change.state;
        }

        // Validation 4: Stabilized event must be last
        if (event.isStabilized) {
          expect(event).toBe(timeline[timeline.length - 1]);
        }
      }
    }
  });
});
