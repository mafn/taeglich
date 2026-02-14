import { cardLabel, cardPoints, dealHands, shuffleDeck } from "./deck";
import {
  computeTeamsByQueens,
  findArmutSeat,
  findHochzeitSeat,
  findSchweinSeat,
  isTrump,
  isLegalPlay,
  legalCardsForPlay,
  trickPoints,
  winnerOfTrick,
} from "./rules";
import {
  type Card,
  type AnnouncementDeclaration,
  type EngineEvent,
  type EngineStep,
  type GameAction,
  type GameMode,
  type GameState,
  type Seat,
  type Team,
  type TeamScore,
  type TeamTotals,
} from "./types";
import type { Ruleset } from "./ruleset";
import { rulesetStandard } from "./ruleset";
import { randomSeed32 } from "../cards/rng";

const SEATS: Seat[] = [0, 1, 2, 3];

function nextSeat(seat: Seat): Seat {
  return ((seat + 1) % 4) as Seat;
}

function findCardIndex(cards: Card[], cardId: string): number {
  return cards.findIndex((card) => card.id === cardId);
}

function blankTotals(): TeamTotals {
  return {
    cardPoints: 0,
    fuchsCaught: 0,
    doppelkopf: 0,
    karlchen: 0,
  };
}

function makeSoloTeams(soloSeat: Seat): Record<Seat, Team> {
  return {
    0: soloSeat === 0 ? "re" : "kontra",
    1: soloSeat === 1 ? "re" : "kontra",
    2: soloSeat === 2 ? "re" : "kontra",
    3: soloSeat === 3 ? "re" : "kontra",
  };
}

function detectInitialMode(
  hands: Record<Seat, Card[]>,
  ruleset: Ruleset,
): { gameMode: GameMode; teamBySeat: Record<Seat, Team> } {
  const hochzeitSeat = findHochzeitSeat(hands);
  const armutSeat = findArmutSeat(hands, ruleset);

  if (hochzeitSeat !== null) {
    if (ruleset.hochzeit.mode === "solo") {
      return {
        gameMode: {
          kind: "solo",
          soloSeat: hochzeitSeat,
          soloType: "forced_hochzeit",
        },
        teamBySeat: makeSoloTeams(hochzeitSeat),
      };
    }

    const teamBySeat = makeSoloTeams(hochzeitSeat);
    return {
      gameMode: {
        kind: "hochzeit",
        holderSeat: hochzeitSeat,
        partnerSeat: null,
        clarificationEndsAtTrick: 3,
      },
      teamBySeat,
    };
  }

  if (armutSeat !== null && ruleset.armut.mode === "normal") {
    return {
      gameMode: {
        kind: "armut",
        armutSeat,
        acceptedBySeat: null,
        exchangeCompleted: false,
      },
      teamBySeat: computeTeamsByQueens(hands),
    };
  }

  return {
    gameMode: { kind: "normal" },
    teamBySeat: computeTeamsByQueens(hands),
  };
}

function buildInitialState(seed: number, ruleset: Ruleset): GameState {
  const deck = shuffleDeck(seed);
  const hands = dealHands(deck);
  const { gameMode, teamBySeat } = detectInitialMode(hands, ruleset);
  const schweineHolderSeat = findSchweinSeat(hands);

  const originalOwnerByCardId: Record<string, Seat> = {};
  for (const seat of SEATS) {
    for (const card of hands[seat]) {
      originalOwnerByCardId[card.id] = seat;
    }
  }

  return {
    seed,
    gameMode,
    schweineHolderSeat,
    schweineActiveSeat: null,
    hands,
    trick: [],
    trickIndex: 1,
    completedTricks: [],
    capturedBySeat: { 0: [], 1: [], 2: [], 3: [] },
    teamBySeat,
    currentSeat: 0,
    finished: false,
    forfeitSeat: null,
    renonceRecords: [],
    announcements: [],
    specialCallouts: [],
    seenCards: new Set<string>(),
    originalOwnerByCardId,
    scoreRe: null,
    scoreKontra: null,
  };
}

function getTeamPoints(state: GameState): Record<Team, TeamTotals> {
  const totals: Record<Team, TeamTotals> = {
    re: blankTotals(),
    kontra: blankTotals(),
  };

  for (const seat of SEATS) {
    const team = state.teamBySeat[seat];
    for (const card of state.capturedBySeat[seat]) {
      totals[team].cardPoints += cardPoints(card.rank);

      // Calculate Fuchs points directly from captured cards (Authoritative)
      if (card.suit === "diamonds" && card.rank === "A") {
        const ownerSeat = state.originalOwnerByCardId[card.id];
        const ownerTeam = state.teamBySeat[ownerSeat];
        if (ownerTeam !== team) {
          totals[team].fuchsCaught += 1;
        }
      }
    }
  }

  for (const callout of state.specialCallouts) {
    const team = state.teamBySeat[callout.seat];
    // FuchsGefangen callouts are now UI-only hints and might include 'false positives' (friendly captures not yet known)
    // So we do NOT sum them here. We used the authoritative card check above.
    if (callout.kind === "Doppelkopf") totals[team].doppelkopf += 1;
    if (callout.kind === "Karlchen") totals[team].karlchen += 1;
  }

  return totals;
}

function seatHasBothDiamondAces(hand: Card[]): boolean {
  let count = 0;
  for (const card of hand) {
    if (card.suit === "diamonds" && card.rank === "A") count += 1;
  }
  return count === 2;
}

function hasPlayedClubQueen(state: GameState, seat: Seat): boolean {
  // Check trick history for Q-Clubs played by this seat
  for (const trick of state.completedTricks) {
    if (
      trick.plays.some(
        (p) =>
          p.seat === seat && p.card.suit === "clubs" && p.card.rank === "Q",
      )
    )
      return true;
  }
  // Also check current trick
  if (
    state.trick.some(
      (p) => p.seat === seat && p.card.suit === "clubs" && p.card.rank === "Q",
    )
  )
    return true;
  return false;
}

function areTeamsPubliclyKnown(state: GameState): boolean {
  if (state.gameMode.kind === "solo") return true; // Solos are always known (1 vs 3)
  if (state.gameMode.kind === "hochzeit") {
    // Known if partner found
    return state.gameMode.partnerSeat !== null;
  }
  if (state.gameMode.kind === "normal") {
    // Known if both Re queens are played, revealing the Re pair
    const seatsWithRe = SEATS.filter((s) => hasPlayedClubQueen(state, s));
    return seatsWithRe.length >= 2;
  }
  return false; // Armut or others might be obscure, default to not known
}

function canAnnounceSchweine(
  state: GameState,
  ruleset: Ruleset,
  seat: Seat,
  timing: "start" | "during",
): boolean {
  if (ruleset.schweine.mode === "disabled") return false;
  if (state.schweineActiveSeat !== null) return false;
  if (state.schweineHolderSeat === null) return false;
  if (seat !== state.schweineHolderSeat) return false;
  if (!seatHasBothDiamondAces(state.hands[seat])) return false;

  if (timing === "start") {
    if (ruleset.schweine.mode !== "announce_at_start") return false;
    return (
      state.completedTricks.length === 0 &&
      state.trick.length === 0 &&
      state.trickIndex === 1
    );
  }

  if (ruleset.schweine.mode !== "announce_while_playing") return false;
  return seat === state.currentSeat && !state.finished;
}

function announceSchweine(
  state: GameState,
  ruleset: Ruleset,
  seat: Seat,
  timing: "start" | "during",
  events: EngineEvent[],
): void {
  if (!canAnnounceSchweine(state, ruleset, seat, timing)) return;

  state.schweineActiveSeat = seat;
  events.push({ type: "SchweineAnnounced", seat, timing });

  if (ruleset.enableCallouts) {
    const callout = {
      kind: "Schweine" as const,
      seat,
      text: `SCHWEINE! Seat ${seat + 1}.`,
    };
    state.specialCallouts.push(callout);
    events.push({ type: "SpecialCallout", callout });
  }
}

function canAnnounceDeclaration(
  state: GameState,
  ruleset: Ruleset,
  seat: Seat,
  declaration: AnnouncementDeclaration,
): boolean {
  if (ruleset.announcements.mode !== "enabled") return false;
  if (!ruleset.announcements.declarations.includes(declaration)) return false;
  if (state.finished) return false;
  if (seat !== state.currentSeat) return false;

  const team = state.teamBySeat[seat];
  if (declaration === "Re" && team !== "re") return false;
  if (declaration === "Kontra" && team !== "kontra") return false;

  return !state.announcements.some(
    (entry) => entry.team === team && entry.declaration === declaration,
  );
}

function announceDeclaration(
  state: GameState,
  ruleset: Ruleset,
  seat: Seat,
  declaration: AnnouncementDeclaration,
): EngineStep {
  if (!canAnnounceDeclaration(state, ruleset, seat, declaration)) {
    return { state, events: [] };
  }

  const team = state.teamBySeat[seat];
  const record = {
    seat,
    team,
    declaration,
    trickIndex: state.trickIndex,
  } as const;
  state.announcements.push(record);

  const events: EngineEvent[] = [
    {
      type: "AnnouncementMade",
      seat,
      team,
      declaration,
      trickIndex: state.trickIndex,
    },
  ];
  return { state, events };
}

function maybeResolveHochzeitByTrick(
  state: GameState,
  winnerSeat: Seat,
  justFinishedTrick: number,
  events: EngineEvent[],
): void {
  if (state.gameMode.kind !== "hochzeit") return;
  if (state.gameMode.partnerSeat !== null) return;

  const holderSeat = state.gameMode.holderSeat;
  if (winnerSeat !== holderSeat) {
    state.gameMode = {
      ...state.gameMode,
      partnerSeat: winnerSeat,
    };
    state.teamBySeat = {
      0: 0 === holderSeat || 0 === winnerSeat ? "re" : "kontra",
      1: 1 === holderSeat || 1 === winnerSeat ? "re" : "kontra",
      2: 2 === holderSeat || 2 === winnerSeat ? "re" : "kontra",
      3: 3 === holderSeat || 3 === winnerSeat ? "re" : "kontra",
    };
    events.push({
      type: "HochzeitPartnerFound",
      holderSeat,
      partnerSeat: winnerSeat,
      trickIndex: justFinishedTrick,
    });
    return;
  }

  if (justFinishedTrick >= state.gameMode.clarificationEndsAtTrick) {
    state.gameMode = {
      kind: "solo",
      soloSeat: holderSeat,
      soloType: "forced_hochzeit",
    };
    state.teamBySeat = makeSoloTeams(holderSeat);
    events.push({
      type: "HochzeitForcedSolo",
      holderSeat,
      trickIndex: justFinishedTrick,
    });
  }
}

function canAcceptArmut(state: GameState, seat: Seat): boolean {
  if (state.finished) return false;
  if (state.trick.length > 0 || state.completedTricks.length > 0) return false;
  if (state.gameMode.kind !== "armut") return false;
  if (state.gameMode.acceptedBySeat !== null) return false;
  if (state.gameMode.armutSeat === seat) return false;
  return true;
}

function acceptArmut(state: GameState, seat: Seat): EngineStep {
  if (!canAcceptArmut(state, seat)) return { state, events: [] };
  if (state.gameMode.kind !== "armut") return { state, events: [] };

  const armutSeat = state.gameMode.armutSeat;
  state.gameMode = {
    ...state.gameMode,
    acceptedBySeat: seat,
  };

  return {
    state,
    events: [{ type: "ArmutAccepted", armutSeat, acceptedBySeat: seat }],
  };
}

function takeCardsByIds(hand: Card[], ids: readonly string[]): Card[] | null {
  const taken: Card[] = [];
  const indexById = new Map<string, number>();
  for (let i = 0; i < hand.length; i += 1) {
    indexById.set(hand[i].id, i);
  }
  for (const id of ids) {
    const idx = indexById.get(id);
    if (idx === undefined) return null;
    taken.push(hand[idx]);
  }
  const takenIds = new Set(ids);
  for (let i = hand.length - 1; i >= 0; i -= 1) {
    if (takenIds.has(hand[i].id)) hand.splice(i, 1);
  }
  return taken;
}

function exchangeArmutCards(
  state: GameState,
  armutSeat: Seat,
  acceptedBySeat: Seat,
  fromArmutCardIds: [string, string, string],
  fromAcceptedCardIds: [string, string, string],
): EngineStep {
  if (state.finished) return { state, events: [] };
  if (state.trick.length > 0 || state.completedTricks.length > 0)
    return { state, events: [] };
  if (state.gameMode.kind !== "armut") return { state, events: [] };
  if (state.gameMode.armutSeat !== armutSeat) return { state, events: [] };
  if (state.gameMode.acceptedBySeat !== acceptedBySeat)
    return { state, events: [] };
  if (state.gameMode.exchangeCompleted) return { state, events: [] };

  const armutHand = state.hands[armutSeat];
  const acceptedHand = state.hands[acceptedBySeat];
  const armutOut = takeCardsByIds(armutHand, fromArmutCardIds);
  const acceptedOut = takeCardsByIds(acceptedHand, fromAcceptedCardIds);
  if (!armutOut || !acceptedOut) return { state, events: [] };

  armutHand.push(...acceptedOut);
  acceptedHand.push(...armutOut);

  state.gameMode = {
    ...state.gameMode,
    exchangeCompleted: true,
  };

  state.teamBySeat = {
    0: 0 === armutSeat || 0 === acceptedBySeat ? "re" : "kontra",
    1: 1 === armutSeat || 1 === acceptedBySeat ? "re" : "kontra",
    2: 2 === armutSeat || 2 === acceptedBySeat ? "re" : "kontra",
    3: 3 === armutSeat || 3 === acceptedBySeat ? "re" : "kontra",
  };

  return {
    state,
    events: [
      { type: "ArmutExchanged", armutSeat, acceptedBySeat, cardsEachWay: 3 },
    ],
  };
}

function buildScore(
  team: Team,
  winner: Team,
  totals: Record<Team, TeamTotals>,
): TeamScore {
  const mine = totals[team];
  const opp = totals[team === "re" ? "kontra" : "re"];
  let points = winner === team ? 1 : 0;

  const details: string[] = [];
  if (winner === team) details.push("Game won");

  const oppPoints = opp.cardPoints;
  if (oppPoints < 90) {
    points += 1;
    details.push("Opponent under 90");
  }
  if (oppPoints < 60) {
    points += 1;
    details.push("Opponent under 60");
  }
  if (oppPoints < 30) {
    points += 1;
    details.push("Opponent under 30");
  }
  if (oppPoints === 0) {
    points += 1;
    details.push("Schwarz");
  }

  if (mine.doppelkopf > 0) {
    points += mine.doppelkopf;
    details.push(`Doppelkopf x${mine.doppelkopf}`);
  }
  if (mine.fuchsCaught > 0) {
    points += mine.fuchsCaught;
    details.push(`Fuchs gefangen x${mine.fuchsCaught}`);
  }
  if (mine.karlchen > 0) {
    points += mine.karlchen;
    details.push(`Karlchen x${mine.karlchen}`);
  }

  return {
    team,
    gamePoints: points,
    details,
  };
}

function resolveHand(state: GameState): EngineEvent {
  const totals = getTeamPoints(state);

  if (state.forfeitSeat !== null) {
    const losingTeam = state.teamBySeat[state.forfeitSeat];
    const winningTeam: Team = losingTeam === "re" ? "kontra" : "re";

    state.scoreRe = {
      team: "re",
      gamePoints: winningTeam === "re" ? 3 : 0,
      details:
        winningTeam === "re"
          ? ["Win by renonce forfeit"]
          : ["Forfeit due to renonce"],
    };
    state.scoreKontra = {
      team: "kontra",
      gamePoints: winningTeam === "kontra" ? 3 : 0,
      details:
        winningTeam === "kontra"
          ? ["Win by renonce forfeit"]
          : ["Forfeit due to renonce"],
    };

    state.finished = true;
    return {
      type: "HandFinished",
      winningTeam,
      scoreRe: state.scoreRe,
      scoreKontra: state.scoreKontra,
      cardPointsRe: totals.re.cardPoints,
      cardPointsKontra: totals.kontra.cardPoints,
      forfeitSeat: state.forfeitSeat,
    };
  }

  const winningTeam: Team =
    totals.re.cardPoints > totals.kontra.cardPoints ? "re" : "kontra";
  state.scoreRe = buildScore("re", winningTeam, totals);
  state.scoreKontra = buildScore("kontra", winningTeam, totals);
  state.finished = true;

  return {
    type: "HandFinished",
    winningTeam,
    scoreRe: state.scoreRe,
    scoreKontra: state.scoreKontra,
    cardPointsRe: totals.re.cardPoints,
    cardPointsKontra: totals.kontra.cardPoints,
    forfeitSeat: null,
  };
}

function evaluateRenonceProofs(
  state: GameState,
  playedCardId: string,
  events: EngineEvent[],
): void {
  for (const record of state.renonceRecords) {
    if (record.proved) continue;
    if (!record.legalCardIdsAtTime.includes(playedCardId)) continue;

    record.proved = true;
    record.provedAtTrickIndex = state.trickIndex;
    state.forfeitSeat = record.seat;

    const text = `Renonce proved: Seat ${record.seat + 1} ignored obligation in trick ${record.trickIndex}.`;

    events.push({
      type: "RenonceProved",
      seat: record.seat,
      trickIndex: record.trickIndex,
      proofTrickIndex: state.trickIndex,
      text,
    });
  }
}

function evaluateSpecialCallouts(
  state: GameState,
  winnerSeat: Seat,
  events: EngineEvent[],
  emitCallouts: boolean,
): void {
  const plays = state.trick;
  const winnerTeam = state.teamBySeat[winnerSeat];

  const points = trickPoints(plays);
  if (points >= 40) {
    const callout = {
      kind: "Doppelkopf" as const,
      seat: winnerSeat,
      text: `Doppelkopf! Seat ${winnerSeat + 1} captured ${points} points in one trick.`,
    };
    state.specialCallouts.push(callout);
    if (emitCallouts) events.push({ type: "SpecialCallout", callout });
  }

  for (const play of plays) {
    if (play.card.suit !== "diamonds" || play.card.rank !== "A") continue;

    const ownerSeat = state.originalOwnerByCardId[play.card.id];
    if (ownerSeat === winnerSeat) continue; // Caught by self is never a capture

    // Logic: Always show "Fuchs caught" if it goes to another player,
    // UNLESS we publicly know they are partners.
    // This preserves the ambiguity/bluff if I play Fuchs to my secret partner.
    const realTeamMatch = state.teamBySeat[ownerSeat] === winnerTeam;
    const teamsKnown = areTeamsPubliclyKnown(state);

    // If it's a friendly capture AND we know it's friendly -> Don't show (it's safe).
    // Otherwise (Hostile OR Friendly-but-secret) -> Show "Caught!"
    if (realTeamMatch && teamsKnown) continue;

    const callout = {
      kind: "FuchsGefangen" as const,
      seat: winnerSeat,
      text: `Fuchs gefangen: Seat ${winnerSeat + 1} caught ${cardLabel(play.card)}.`,
    };
    state.specialCallouts.push(callout);
    if (emitCallouts) events.push({ type: "SpecialCallout", callout });
  }

  if (state.trickIndex === 12) {
    const winningPlay = plays.find((play) => play.seat === winnerSeat);
    if (
      winningPlay &&
      winningPlay.card.suit === "clubs" &&
      winningPlay.card.rank === "J"
    ) {
      const callout = {
        kind: "Karlchen" as const,
        seat: winnerSeat,
        text: `Karlchen! Seat ${winnerSeat + 1} wins the final trick with Jack of Clubs.`,
      };
      state.specialCallouts.push(callout);
      if (emitCallouts) events.push({ type: "SpecialCallout", callout });
    }
  }
}

function playCard(
  state: GameState,
  seat: Seat,
  cardId: string,
  ruleset: Ruleset,
): EngineStep {
  if (state.finished) {
    return { state, events: [] };
  }
  if (state.gameMode.kind === "armut" && !state.gameMode.exchangeCompleted) {
    return { state, events: [] };
  }
  if (seat !== state.currentSeat) {
    return { state, events: [] };
  }

  const events: EngineEvent[] = [];
  if (
    ruleset.schweine.mode === "announce_while_playing" &&
    ruleset.schweine.announce === "auto"
  ) {
    announceSchweine(state, ruleset, seat, "during", events);
  }

  const hand = state.hands[seat];
  const cardIndex = findCardIndex(hand, cardId);
  if (cardIndex < 0) {
    return { state, events: [] };
  }

  const card = hand[cardIndex];
  const legal = isLegalPlay(hand, state.trick, cardId, state.gameMode);
  if (!legal && !ruleset.allowIllegalPlays) {
    return { state, events: [] };
  }

  hand.splice(cardIndex, 1);

  if (!legal) {
    const legalCardIdsAtTime = legalCardsForPlay(
      [...hand, card],
      state.trick,
      state.gameMode,
    ).map((entry) => entry.id);
    const lead = state.trick[0]?.card ?? null;
    state.renonceRecords.push({
      seat,
      trickIndex: state.trickIndex,
      leadKind: lead && isTrump(lead) ? "trump" : "suit",
      leadSuit: lead?.suit ?? null,
      legalCardIdsAtTime,
      proved: false,
      provedAtTrickIndex: null,
    });

    events.push({
      type: "IllegalPlayRecorded",
      seat,
      trickIndex: state.trickIndex,
    });
  }

  state.trick.push({ seat, card, wasLegal: legal });
  state.seenCards.add(card.id);
  events.push({ type: "CardPlayed", seat, cardId: card.id, wasLegal: legal });

  evaluateRenonceProofs(state, card.id, events);

  if (state.trick.length < 4) {
    state.currentSeat = nextSeat(seat);
    return { state, events };
  }

  const winnerPlay = winnerOfTrick(
    state.trick,
    state.trickIndex,
    state.schweineActiveSeat,
    ruleset,
    state.gameMode,
  );
  const points = trickPoints(state.trick);

  state.completedTricks.push({
    index: state.trickIndex,
    plays: [...state.trick],
    winner: winnerPlay.seat,
    points,
  });

  state.capturedBySeat[winnerPlay.seat].push(
    ...state.trick.map((play) => play.card),
  );

  events.push({
    type: "TrickWon",
    trickIndex: state.trickIndex,
    winner: winnerPlay.seat,
    points,
  });

  maybeResolveHochzeitByTrick(state, winnerPlay.seat, state.trickIndex, events);
  evaluateSpecialCallouts(
    state,
    winnerPlay.seat,
    events,
    ruleset.enableCallouts,
  );

  state.trick = [];
  state.currentSeat = winnerPlay.seat;
  state.trickIndex += 1;

  if (state.completedTricks.length === 12) {
    events.push(resolveHand(state));
  }

  return { state, events };
}

export function createEngine(
  seed?: number,
  ruleset: Ruleset = rulesetStandard(),
): EngineStep {
  const resolvedSeed = seed ?? randomSeed32();
  const state = buildInitialState(resolvedSeed, ruleset);
  const events: EngineEvent[] = [
    { type: "HandStarted", seed: resolvedSeed },
    { type: "GameModeInitialized", mode: state.gameMode },
  ];

  if (
    ruleset.schweine.mode === "announce_at_start" &&
    ruleset.schweine.announce === "auto"
  ) {
    if (state.schweineHolderSeat !== null) {
      announceSchweine(
        state,
        ruleset,
        state.schweineHolderSeat,
        "start",
        events,
      );
    }
  }

  return { state, events };
}

export function reduce(
  state: GameState,
  action: GameAction,
  ruleset: Ruleset = rulesetStandard(),
): EngineStep {
  if (action.type === "StartHand") {
    return createEngine(action.seed, ruleset);
  }

  if (action.type === "AnnounceSchweine") {
    const events: EngineEvent[] = [];
    const timing =
      ruleset.schweine.mode === "announce_at_start" ? "start" : "during";
    announceSchweine(state, ruleset, action.seat, timing, events);
    return { state, events };
  }

  if (action.type === "Announce") {
    return announceDeclaration(state, ruleset, action.seat, action.declaration);
  }

  if (action.type === "AcceptArmut") {
    return acceptArmut(state, action.seat);
  }

  if (action.type === "ExchangeArmutCards") {
    return exchangeArmutCards(
      state,
      action.armutSeat,
      action.acceptedBySeat,
      action.fromArmutCardIds,
      action.fromAcceptedCardIds,
    );
  }

  if (action.type === "PlayCard") {
    return playCard(state, action.seat, action.cardId, ruleset);
  }

  return { state, events: [] };
}

export function legalMoves(state: GameState, seat: Seat): string[] {
  if (state.finished || seat !== state.currentSeat) return [];
  return legalCardsForPlay(state.hands[seat], state.trick, state.gameMode).map(
    (card) => card.id,
  );
}

export function computePublicScore(state: GameState): Record<Team, TeamTotals> {
  return getTeamPoints(state);
}
