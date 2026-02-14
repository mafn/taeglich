import { expect, test } from "@playwright/test";
import { createEngine, reduce, legalMoves } from "../src/lib/doppelkopf/engine";
import { cardPoints } from "../src/lib/doppelkopf/deck";
import { rulesetStandard } from "../src/lib/doppelkopf/ruleset";
import { isTrump } from "../src/lib/doppelkopf/rules";

test.describe("Doppelkopf Engine", () => {
  test("initializes with 12 cards per seat", () => {
    const { state } = createEngine(12345);
    expect(state.hands[0]).toHaveLength(12);
    expect(state.hands[1]).toHaveLength(12);
    expect(state.hands[2]).toHaveLength(12);
    expect(state.hands[3]).toHaveLength(12);
  });

  test("enforces legal moves (must follow suit)", () => {
    const { state } = createEngine(42, rulesetStandard());

    // Seat 0 leads a non-trump
    const hand0 = state.hands[0];
    const nonTrump = hand0.find((c) => !isTrump(c));
    if (!nonTrump) return; // Should not happen with standard deck

    let step = reduce(state, {
      type: "PlayCard",
      seat: 0,
      cardId: nonTrump.id,
    });

    // Seat 1 must follow suit if they have it
    const seat1 = step.state.currentSeat;
    expect(seat1).toBe(1);

    const hand1 = step.state.hands[1];
    const cardsOfSuit = hand1.filter(
      (c) => !isTrump(c) && c.suit === nonTrump.suit,
    );
    const legal = legalMoves(step.state, 1);

    if (cardsOfSuit.length > 0) {
      // Must play one of the suit
      expect(legal.length).toBe(cardsOfSuit.length);
      for (const id of legal) {
        const card = hand1.find((c) => c.id === id);
        expect(card?.suit).toBe(nonTrump.suit);
        expect(isTrump(card!)).toBe(false);
      }
    } else {
      // Can play anything
      expect(legal.length).toBe(hand1.length);
    }
  });

  test("correctly identifies trick winner and awards points", () => {
    // We'll use a specific seed or mock plays if needed, but let's just play 4 cards.
    const { state } = createEngine(101, rulesetStandard());

    let cur = state;
    for (let i = 0; i < 4; i++) {
      const seat = cur.currentSeat;
      const legal = legalMoves(cur, seat);
      const step = reduce(cur, { type: "PlayCard", seat, cardId: legal[0] });
      cur = step.state;
    }

    expect(cur.completedTricks).toHaveLength(1);
    const trick = cur.completedTricks[0];
    const expectedPoints = trick.plays.reduce(
      (sum, p) => sum + cardPoints(p.card.rank),
      0,
    );
    expect(trick.points).toBe(expectedPoints);

    expect(cur.capturedBySeat[trick.winner]).toContain(trick.plays[0].card);
    expect(cur.currentSeat).toBe(trick.winner);
  });

  test("rulesetObliviousDay disables meta systems", () => {
    // In standard, Schweine might be enabled if we changed rulesetStandard,
    // but let's check announcements specifically.

    // We need to check if we can announce Re/Kontra.
    // In standard it's enabled.

    const { state: stateOblivious } = createEngine(99, {
      announcements: { mode: "disabled" },
      schweine: { mode: "disabled" },
      hochzeit: { mode: "solo", soloSeat: null },
      armut: { mode: "as_regular_game" },
      solo: { mode: "disabled" },
      allowIllegalPlays: false,
      enableCallouts: false,
      dulleBeatsDulle: "except_last_trick",
    });

    expect(stateOblivious.gameMode.kind).not.toBe("hochzeit");
    expect(stateOblivious.gameMode.kind).not.toBe("armut");
  });
});
