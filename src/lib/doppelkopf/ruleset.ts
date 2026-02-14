import type { AnnouncementDeclaration, Seat, SoloType } from "./types";

export type AnnouncementPolicy =
  | { mode: "disabled" }
  | {
      mode: "enabled";
      declarations: AnnouncementDeclaration[];
    };

export type SchweinePolicy =
  | { mode: "disabled" }
  | {
      mode: "announce_at_start" | "announce_while_playing";
      announce: "manual" | "auto";
    };

export type HochzeitPolicy =
  | { mode: "normal" }
  | {
      /**
       * Oblivious day UX: treat Hochzeit as a solo (no partner finding).
       * Still keep the engine able to support real Hochzeit elsewhere.
       */
      mode: "solo";
      soloSeat: Seat | null;
    };

export type ArmutPolicy =
  | { mode: "normal" }
  | {
      /**
       * Oblivious day UX: ignore Armut mechanics and play as normal.
       */
      mode: "as_regular_game";
    };

export type SoloPolicy =
  | { mode: "disabled" }
  | {
      mode: "enabled";
      allowed: SoloType[];
    };

export interface Ruleset {
  announcements: AnnouncementPolicy;
  schweine: SchweinePolicy;
  hochzeit: HochzeitPolicy;
  armut: ArmutPolicy;
  solo: SoloPolicy;
  /**
   * If true, the UI is allowed to send illegal plays and the engine records them.
   * If false, the engine rejects illegal plays.
   */
  allowIllegalPlays: boolean;
  /**
   * Enable optional table callouts like Schweine. The 2026-02-16 artifact keeps
   * this off (no announcements).
   */
  enableCallouts: boolean;
  /**
   * If not disabled, the second Dulle (10 hearts) beats the first one.
   */
  dulleBeatsDulle: "disabled" | "always" | "except_last_trick";
}

export function rulesetStandard(): Ruleset {
  return {
    announcements: {
      mode: "enabled",
      declarations: ["Re", "Kontra", "No90", "No60", "No30", "Schwarz", "No9"],
    },
    schweine: { mode: "disabled" },
    hochzeit: { mode: "normal" },
    armut: { mode: "normal" },
    solo: {
      mode: "enabled",
      allowed: [
        "queen_jack",
        "jack",
        "queen",
        "clubs",
        "spades",
        "hearts",
        "diamonds",
      ],
    },
    allowIllegalPlays: false,
    enableCallouts: true,
    dulleBeatsDulle: "except_last_trick",
  };
}

export function rulesetObliviousDay(): Ruleset {
  return {
    announcements: { mode: "disabled" },
    schweine: { mode: "disabled" },
    hochzeit: { mode: "solo", soloSeat: null },
    armut: { mode: "as_regular_game" },
    solo: { mode: "disabled" },
    // 2026-02-16 UX: no meta systems (announcements, callouts, renonce audits).
    // Keep the engine capable elsewhere via other rulesets/modes.
    allowIllegalPlays: false,
    enableCallouts: false,
    dulleBeatsDulle: "except_last_trick",
  };
}
