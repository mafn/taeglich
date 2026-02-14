export const SUITS = ["clubs", "spades", "hearts", "diamonds"] as const;
export const RANKS = ["A", "10", "K", "Q", "J", "9"] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];
export type Seat = 0 | 1 | 2 | 3;
export type Team = "re" | "kontra";
export type AnnouncementDeclaration =
  | "Re"
  | "Kontra"
  | "No90"
  | "No60"
  | "No30"
  | "Schwarz"
  | "No9";

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  copy: 0 | 1;
}

export interface TrickPlay {
  seat: Seat;
  card: Card;
  wasLegal: boolean;
}

export interface TrickResult {
  index: number;
  plays: TrickPlay[];
  winner: Seat;
  points: number;
}

export interface RenonceRecord {
  seat: Seat;
  trickIndex: number;
  leadKind: "trump" | "suit";
  leadSuit: Suit | null;
  legalCardIdsAtTime: string[];
  proved: boolean;
  provedAtTrickIndex: number | null;
}

export interface TeamTotals {
  cardPoints: number;
  fuchsCaught: number;
  doppelkopf: number;
  karlchen: number;
}

export interface TeamScore {
  team: Team;
  gamePoints: number;
  details: string[];
}

export interface SpecialCallout {
  kind: "Schweine" | "FuchsGefangen" | "Doppelkopf" | "Karlchen";
  seat: Seat;
  text: string;
}

export type SoloType =
  | "queen_jack"
  | "jack"
  | "queen"
  | "clubs"
  | "spades"
  | "hearts"
  | "diamonds"
  | "fleischlos"
  | "forced_hochzeit"
  | "forced_armut";

export type GameMode =
  | { kind: "normal" }
  | {
      kind: "hochzeit";
      holderSeat: Seat;
      partnerSeat: Seat | null;
      clarificationEndsAtTrick: number;
    }
  | {
      kind: "armut";
      armutSeat: Seat;
      acceptedBySeat: Seat | null;
      exchangeCompleted: boolean;
    }
  | {
      kind: "solo";
      soloSeat: Seat;
      soloType: SoloType;
    };

export interface AnnouncementRecord {
  seat: Seat;
  team: Team;
  declaration: AnnouncementDeclaration;
  trickIndex: number;
}

export type EngineEvent =
  | { type: "HandStarted"; seed: number }
  | { type: "GameModeInitialized"; mode: GameMode }
  | {
      type: "HochzeitPartnerFound";
      holderSeat: Seat;
      partnerSeat: Seat;
      trickIndex: number;
    }
  | { type: "HochzeitForcedSolo"; holderSeat: Seat; trickIndex: number }
  | { type: "ArmutAccepted"; armutSeat: Seat; acceptedBySeat: Seat }
  | {
      type: "ArmutExchanged";
      armutSeat: Seat;
      acceptedBySeat: Seat;
      cardsEachWay: number;
    }
  | {
      type: "AnnouncementMade";
      seat: Seat;
      team: Team;
      declaration: AnnouncementDeclaration;
      trickIndex: number;
    }
  | { type: "SchweineAnnounced"; seat: Seat; timing: "start" | "during" }
  | { type: "CardPlayed"; seat: Seat; cardId: string; wasLegal: boolean }
  | { type: "IllegalPlayRecorded"; seat: Seat; trickIndex: number }
  | {
      type: "RenonceProved";
      seat: Seat;
      trickIndex: number;
      proofTrickIndex: number;
      text: string;
    }
  | {
      type: "TrickWon";
      trickIndex: number;
      winner: Seat;
      points: number;
    }
  | {
      type: "SpecialCallout";
      callout: SpecialCallout;
    }
  | {
      type: "HandFinished";
      winningTeam: Team;
      scoreRe: TeamScore;
      scoreKontra: TeamScore;
      cardPointsRe: number;
      cardPointsKontra: number;
      forfeitSeat: Seat | null;
    };

export type GameAction =
  | { type: "StartHand"; seed?: number }
  | { type: "Announce"; seat: Seat; declaration: AnnouncementDeclaration }
  | { type: "AcceptArmut"; seat: Seat }
  | {
      type: "ExchangeArmutCards";
      armutSeat: Seat;
      acceptedBySeat: Seat;
      fromArmutCardIds: [string, string, string];
      fromAcceptedCardIds: [string, string, string];
    }
  | { type: "AnnounceSchweine"; seat: Seat }
  | { type: "PlayCard"; seat: Seat; cardId: string };

export interface GameState {
  seed: number;
  gameMode: GameMode;
  schweineHolderSeat: Seat | null;
  schweineActiveSeat: Seat | null;
  hands: Record<Seat, Card[]>;
  trick: TrickPlay[];
  trickIndex: number;
  completedTricks: TrickResult[];
  capturedBySeat: Record<Seat, Card[]>;
  teamBySeat: Record<Seat, Team>;
  currentSeat: Seat;
  finished: boolean;
  forfeitSeat: Seat | null;
  renonceRecords: RenonceRecord[];
  announcements: AnnouncementRecord[];
  specialCallouts: SpecialCallout[];
  seenCards: Set<string>;
  originalOwnerByCardId: Record<string, Seat>;
  scoreRe: TeamScore | null;
  scoreKontra: TeamScore | null;
}

export interface EngineStep {
  state: GameState;
  events: EngineEvent[];
}

import type { Ruleset } from "./ruleset";

export interface BotView {
  seat: Seat;
  hand: Card[];
  currentTrick: TrickPlay[];
  completedTricks: TrickResult[];
  legalCards: Card[];
  trickIndex: number;
  gameMode: GameMode;
  announcements: AnnouncementRecord[];
  specialCallouts: SpecialCallout[];
  ruleset: Ruleset;
}
