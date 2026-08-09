import type { CardId } from "../cards/catalog";
import type { MonthNumber } from "../cards/months";
import type { RngSnapshotV1 } from "../random/types";

export const AUTHORITATIVE_STATE_FORMAT_VERSION = 1 as const;
export const RULES_VERSION = "1.0" as const;
export const PLAYER_IDS = ["player-a", "player-b"] as const;
export const MATCH_LENGTHS = [3, 6, 12] as const;

export type PlayerId = (typeof PLAYER_IDS)[number];
export type MatchLength = (typeof MATCH_LENGTHS)[number];
export type TableMultiplier = 1 | 2 | 3 | 4;
export type PlayerPair<T> = readonly [T, T];

export interface CompleteMonthEvidence {
  readonly month: MonthNumber;
  readonly cardIds: readonly CardId[];
}

export interface MonthPairEvidence {
  readonly month: MonthNumber;
  readonly cardIds: readonly CardId[];
}

export type LuckyQualification =
  | {
      readonly kind: "fourMonth";
      readonly completeMonths: readonly CompleteMonthEvidence[];
    }
  | {
      readonly kind: "fourPairs";
      readonly pairs: readonly MonthPairEvidence[];
    };

export interface LuckyHandEvidence {
  readonly playerId: PlayerId;
  readonly fullHand: readonly CardId[];
  readonly qualification: LuckyQualification;
}

export interface PointDeltas {
  readonly "player-a": number;
  readonly "player-b": number;
}

export interface PlayerCardCounts {
  readonly "player-a": number;
  readonly "player-b": number;
}

export interface FieldCancellationResult {
  readonly kind: "fieldCancellation";
  readonly reasonCode: "FIELD_FOUR_MONTH_CANCELLED";
  readonly pointDeltas: PointDeltas;
  readonly completeFieldMonths: readonly CompleteMonthEvidence[];
  readonly luckyHandsEvaluated: false;
  readonly yakuDecisionRequired: false;
}

export interface LuckyWinResult {
  readonly kind: "luckyWin";
  readonly reasonCode: "LUCKY_FOUR_MONTH" | "LUCKY_FOUR_PAIRS";
  readonly winnerId: PlayerId;
  readonly pointDeltas: PointDeltas;
  readonly basePoints: 6;
  readonly scoringMultiplier: 1;
  readonly awardedPoints: 6;
  readonly ordinaryYakuPoints: 0;
  readonly evidence: readonly [LuckyHandEvidence];
  readonly yakuDecisionRequired: false;
}

export interface BothLuckyDrawResult {
  readonly kind: "bothLuckyDraw";
  readonly reasonCode: "BOTH_LUCKY_DRAW";
  readonly pointDeltas: PointDeltas;
  readonly ordinaryYakuPoints: 0;
  readonly evidence: readonly [LuckyHandEvidence, LuckyHandEvidence];
  readonly yakuDecisionRequired: false;
}

export type AutomaticOpeningResult = FieldCancellationResult | LuckyWinResult | BothLuckyDrawResult;

export interface PlayerStateV1 {
  readonly id: PlayerId;
  readonly score: number;
  readonly hand: readonly CardId[];
  readonly captured: readonly CardId[];
  readonly seenYakuKeys: readonly string[];
}

export interface SpecialPrivilegeStateV1 {
  readonly playerId: PlayerId;
  readonly grantedFromRound: number;
  readonly status: "available";
}

export interface RoundStateV1 {
  readonly roundNumber: number;
  readonly scheduledMonth: MonthNumber;
  readonly isFinalScheduledRound: boolean;
  readonly starterId: PlayerId;
  readonly field: readonly CardId[];
  readonly drawPile: readonly CardId[];
  readonly tableMultiplier: TableMultiplier;
  readonly mostRecentKoiKoiCallerId: PlayerId | null;
  readonly firstYakuTriggerPlayerId: PlayerId | null;
  readonly specialPrivilege: SpecialPrivilegeStateV1 | null;
  readonly frozenFinalRoundLeaderId: PlayerId | null;
}

export type EnginePhaseV1 =
  | {
      readonly kind: "awaitingHandPlay";
      readonly playerId: PlayerId;
    }
  | {
      readonly kind: "roundComplete";
      readonly result: AutomaticOpeningResult;
      readonly transitionPending: true;
    };

export interface AuthoritativeGameStateV1 {
  readonly formatVersion: 1;
  readonly rulesVersion: typeof RULES_VERSION;
  readonly stateVersion: number;
  readonly lastAcceptedCommandId: string;
  readonly matchId: string;
  readonly matchLength: MatchLength;
  readonly status: "inProgress" | "complete";
  readonly players: PlayerPair<PlayerStateV1>;
  readonly round: RoundStateV1;
  readonly phase: EnginePhaseV1;
  readonly history: readonly never[];
}

export type EventAudience =
  | { readonly kind: "public" }
  | { readonly kind: "private"; readonly playerId: PlayerId }
  | { readonly kind: "serverOnly" };

interface SetupEventBase {
  readonly audience: EventAudience;
}

export type SetupEventV1 =
  | (SetupEventBase & {
      readonly type: "matchStarted";
      readonly matchId: string;
      readonly matchLength: MatchLength;
    })
  | (SetupEventBase & {
      readonly type: "starterSelected";
      readonly starterId: PlayerId;
    })
  | (SetupEventBase & {
      readonly type: "roundStarted";
      readonly roundNumber: number;
      readonly scheduledMonth: MonthNumber;
      readonly starterId: PlayerId;
    })
  | (SetupEventBase & {
      readonly type: "cardsDealt";
      readonly field: readonly CardId[];
      readonly handCounts: PlayerCardCounts;
      readonly drawPileCount: number;
    })
  | (SetupEventBase & {
      readonly type: "initialHandDealt";
      readonly playerId: PlayerId;
      readonly cardIds: readonly CardId[];
    })
  | (SetupEventBase & {
      readonly type: "drawPileOrdered";
      readonly cardIds: readonly CardId[];
    })
  | (SetupEventBase & {
      readonly type: "initialFieldCancellationDetected";
      readonly completeFieldMonths: readonly CompleteMonthEvidence[];
    })
  | (SetupEventBase & {
      readonly type: "luckyHandDetected";
      readonly playerId: PlayerId;
      readonly qualification: LuckyQualification;
    })
  | (SetupEventBase & {
      readonly type: "automaticRoundResultCommitted";
      readonly resultKind: AutomaticOpeningResult["kind"];
      readonly reasonCode: AutomaticOpeningResult["reasonCode"];
      readonly pointDeltas: PointDeltas;
    })
  | (SetupEventBase & {
      readonly type: "luckyHandEvidenceRevealed";
      readonly evidence: readonly LuckyHandEvidence[];
    })
  | (SetupEventBase & {
      readonly type: "roundReady";
      readonly activePlayerId: PlayerId;
    });

export interface EngineCheckpointV1 {
  readonly version: 1;
  readonly rng: RngSnapshotV1;
}

export interface EngineTransitionV1 {
  readonly state: AuthoritativeGameStateV1;
  readonly events: readonly SetupEventV1[];
  readonly checkpoint: EngineCheckpointV1;
}

export interface StartMatchCommandV1 {
  readonly type: "startMatch";
  readonly commandId: string;
  readonly matchId: string;
  readonly expectedStateVersion: 0;
  readonly matchLength: MatchLength;
  readonly starterPolicy:
    { readonly kind: "chooseWithRng" } | { readonly kind: "provided"; readonly playerId: PlayerId };
}
