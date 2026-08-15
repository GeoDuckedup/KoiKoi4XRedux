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
export type CapturePhase = "hand" | "draw";

export const YAKU_TRIGGER_KEYS = [
  "fiveBrights",
  "fourBrights",
  "fourBrightsWithRain",
  "threeBrights",
  "blossomViewing",
  "moonViewing",
  "animalTrio",
  "redTextScrolls",
  "blueScrolls",
  "currentMonthSet",
  "animals",
  "scrolls",
  "plainCards",
] as const;

export type YakuTriggerKey = (typeof YAKU_TRIGGER_KEYS)[number];

export type YakuDisplayName =
  | "Five Brights"
  | "Four Brights"
  | "Four Brights with Rain"
  | "Three Brights"
  | "Blossom Viewing"
  | "Moon Viewing"
  | "Animal Trio"
  | "Red Text Scrolls"
  | "Blue Scrolls"
  | "Current-Month Set"
  | "Animals"
  | "Scrolls"
  | "Plain Cards";

export interface ActiveYakuV1 {
  readonly key: YakuTriggerKey;
  readonly name: YakuDisplayName;
  readonly points: number;
}

/**
 * Immutable evidence captured at the exact Yaku-check that first completed a
 * trigger key. Sequences are round-global so independently formed yaku can be
 * rendered in their actual chronology, including overlapping card sets.
 */
export interface CompletedYakuFormationV1 {
  readonly sequence: number;
  readonly playerId: PlayerId;
  readonly phase: CapturePhase;
  readonly yaku: ActiveYakuV1;
  readonly contributingCardIds: readonly CardId[];
}

/** A final scored-yaku row linked back to its trigger-time formation. */
export interface ScoredYakuEvidenceV1 {
  readonly formationSequence: number;
  readonly yaku: ActiveYakuV1;
  readonly contributingCardIds: readonly CardId[];
}

export type YakuDecisionResumeV1 =
  | { readonly kind: "drawPhase" }
  | { readonly kind: "completeTurn"; readonly lastActorId: PlayerId }
  | { readonly kind: "endOfPlay"; readonly lastActorId: PlayerId };

export interface YakuDecisionContextV1 {
  readonly phase: CapturePhase;
  readonly newYaku: readonly ActiveYakuV1[];
  readonly activeYaku: readonly ActiveYakuV1[];
  readonly currentYakuTotal: number;
  readonly resume: YakuDecisionResumeV1;
}

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

export type RoundResultReasonCodeV1 =
  | "BANKED_SCORE"
  | "END_OF_PLAY_LAST_KOI_CALLER"
  | "END_OF_PLAY_NO_SCORE"
  | AutomaticOpeningResult["reasonCode"];

export type RoundResultKindV1 =
  "bankedScore" | "endOfPlayLastKoiCaller" | "endOfPlayNoScore" | AutomaticOpeningResult["kind"];

export type RoundResultEvidenceV1 =
  | {
      readonly kind: "fieldCancellation";
      readonly completeFieldMonths: readonly CompleteMonthEvidence[];
    }
  | {
      readonly kind: "luckyHands";
      readonly hands: readonly LuckyHandEvidence[];
    }
  | {
      readonly kind: "ordinaryYaku";
      readonly completedFormations: readonly CompletedYakuFormationV1[];
      readonly scoredYaku: readonly ScoredYakuEvidenceV1[];
    }
  | null;

export type NextRoundStarterReasonV1 =
  | "LOW_MULTIPLIER_LOSER_STARTS"
  | "HIGH_MULTIPLIER_WINNER_STARTS"
  | "JANUARY_ZERO_ALTERNATES"
  | "LATER_ZERO_PRESERVES_STARTER";

export interface NextRoundPlanV1 {
  readonly roundNumber: number;
  readonly scheduledMonth: MonthNumber;
  readonly starterId: PlayerId;
  readonly starterReason: NextRoundStarterReasonV1;
  readonly specialPrivilege: SpecialPrivilegeStateV1 | null;
}

export interface RoundResultV1 {
  readonly roundNumber: number;
  readonly scheduledMonth: MonthNumber;
  readonly starterId: PlayerId;
  readonly kind: RoundResultKindV1;
  readonly reasonCode: RoundResultReasonCodeV1;
  readonly scorerId: PlayerId | null;
  readonly pointDeltas: PointDeltas;
  readonly activeYaku: readonly ActiveYakuV1[];
  readonly basePoints: number;
  readonly tableMultiplierAtDecision: TableMultiplier | null;
  readonly scoringMultiplier: TableMultiplier | null;
  readonly awardedPoints: number;
  readonly evidence: RoundResultEvidenceV1;
  readonly nextRound: NextRoundPlanV1 | null;
  readonly matchScoresAfter: PointDeltas;
}

export interface MatchResultV1 {
  readonly matchLength: MatchLength;
  readonly roundsPlayed: number;
  readonly finalScores: PointDeltas;
  readonly winnerId: PlayerId | null;
}

export interface PlayerStateV1 {
  readonly id: PlayerId;
  readonly score: number;
  readonly hand: readonly CardId[];
  readonly captured: readonly CardId[];
  readonly seenYakuKeys: readonly YakuTriggerKey[];
  readonly activeYaku: readonly ActiveYakuV1[];
  readonly currentYakuTotal: number;
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
  readonly completedYakuFormations: readonly CompletedYakuFormationV1[];
}

export type EnginePhaseV1 =
  | {
      readonly kind: "awaitingHandPlay";
      readonly playerId: PlayerId;
    }
  | {
      readonly kind: "awaitingDrawResolution";
      readonly playerId: PlayerId;
      readonly drawnCardId: CardId;
      readonly resolution: DrawResolutionPreviewV1;
    }
  | {
      readonly kind: "awaitingYakuDecision";
      readonly playerId: PlayerId;
      readonly context: YakuDecisionContextV1;
    }
  | {
      readonly kind: "roundComplete";
      readonly result: RoundResultV1;
      readonly transitionPending: true;
    }
  | {
      readonly kind: "matchComplete";
      readonly result: MatchResultV1;
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
  readonly history: readonly RoundResultV1[];
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
  readonly matchId: string;
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

interface GameplayCommandBaseV1 {
  readonly commandId: string;
  readonly matchId: string;
  readonly actorId: PlayerId;
  readonly expectedStateVersion: number;
}

export interface PlayHandCardCommandV1 extends GameplayCommandBaseV1 {
  readonly type: "playHandCard";
  readonly cardId: CardId;
  readonly targetFieldCardId?: CardId;
}

export interface ResolveDrawCardCommandV1 extends GameplayCommandBaseV1 {
  readonly type: "resolveDrawCard";
  readonly targetFieldCardId?: CardId | undefined;
}

export interface ChooseYakuDecisionCommandV1 extends GameplayCommandBaseV1 {
  readonly type: "chooseYakuDecision";
  readonly choice: "bank" | "koiKoi";
}

export type GameplayCommandV1 =
  PlayHandCardCommandV1 | ResolveDrawCardCommandV1 | ChooseYakuDecisionCommandV1;

export interface AdvanceRoundCommandV1 {
  readonly type: "advanceRound";
  readonly commandId: string;
  readonly matchId: string;
  readonly expectedStateVersion: number;
}

export type HandPlayResolutionPreviewV1 =
  | {
      readonly kind: "placeOnField";
      readonly matchingFieldCardIds: readonly [];
    }
  | {
      readonly kind: "capturePair";
      readonly matchingFieldCardIds: readonly [CardId];
    }
  | {
      readonly kind: "captureChoice";
      readonly matchingFieldCardIds: readonly [CardId, CardId];
    }
  | {
      readonly kind: "fourCardSweep";
      readonly matchingFieldCardIds: readonly [CardId, CardId, CardId];
    };

/**
 * A Draw uses the same authoritative capture classification as a Hand play.
 * Keeping this alias makes the phase source explicit without duplicating rules.
 */
export type DrawResolutionPreviewV1 = HandPlayResolutionPreviewV1;

export type LegalActionV1 =
  | {
      readonly type: "playHandCard";
      readonly actorId: PlayerId;
      readonly cardId: CardId;
      readonly targetFieldCardId?: CardId | undefined;
      readonly resolution: HandPlayResolutionPreviewV1;
    }
  | {
      readonly type: "resolveDrawCard";
      readonly actorId: PlayerId;
      readonly drawnCardId: CardId;
      readonly targetFieldCardId?: CardId | undefined;
      readonly resolution: DrawResolutionPreviewV1;
    }
  | {
      readonly type: "chooseYakuDecision";
      readonly actorId: PlayerId;
      readonly choice: "bank";
      readonly tableMultiplierAtDecision: TableMultiplier;
      readonly scoringMultiplier: TableMultiplier;
      readonly awardedPoints: number;
    }
  | {
      readonly type: "chooseYakuDecision";
      readonly actorId: PlayerId;
      readonly choice: "koiKoi";
      readonly currentTableMultiplier: TableMultiplier;
      readonly resultingTableMultiplier: TableMultiplier;
    };

interface TurnEventBase {
  readonly audience: EventAudience;
  readonly actorId: PlayerId;
}

export type TurnEventV1 =
  | (TurnEventBase & {
      readonly type: "handCardPlayed";
      readonly cardId: CardId;
    })
  | (TurnEventBase & {
      readonly type: "cardPlacedOnField";
      readonly phase: CapturePhase;
      readonly cardId: CardId;
    })
  | (TurnEventBase & {
      readonly type: "captureStarted";
      readonly phase: CapturePhase;
      readonly sourceCardId: CardId;
      readonly targetFieldCardIds: readonly CardId[];
      readonly captureKind: "pair" | "fourCardSweep";
    })
  | (TurnEventBase & {
      readonly type: "cardsCaptured";
      readonly phase: CapturePhase;
      readonly cardIds: readonly CardId[];
      readonly captureKind: "pair" | "fourCardSweep";
    })
  | (TurnEventBase & {
      readonly type: "drawCardRevealed";
      readonly cardId: CardId;
      readonly remainingDrawPileCount: number;
    })
  | (TurnEventBase & {
      readonly type: "drawResolutionRequired";
      readonly drawnCardId: CardId;
      readonly resolution: DrawResolutionPreviewV1;
    })
  | (TurnEventBase & {
      readonly type: "yakuCompleted";
      readonly phase: CapturePhase;
      readonly yaku: ActiveYakuV1;
    })
  | (TurnEventBase & {
      readonly type: "yakuValueChanged";
      readonly phase: CapturePhase;
      readonly yakuKey: YakuTriggerKey;
      readonly name: YakuDisplayName;
      readonly previousPoints: number;
      readonly currentPoints: number;
    })
  | (TurnEventBase & {
      readonly type: "yakuDecisionRequired";
      readonly context: YakuDecisionContextV1;
    })
  | (TurnEventBase & {
      readonly type: "turnCompleted";
      readonly nextPlayerId: PlayerId | null;
    })
  | (TurnEventBase & {
      readonly type: "endOfPlayReached";
      readonly unusedDrawPileCount: number;
    });

interface RoundEventBase {
  readonly audience: { readonly kind: "public" };
}

export type RoundEventV1 =
  | (RoundEventBase & {
      readonly type: "yakuDecisionChosen";
      readonly actorId: PlayerId;
      readonly choice: "bank" | "koiKoi";
      readonly privilegeUsed: boolean;
    })
  | (RoundEventBase & {
      readonly type: "koiKoiCalled";
      readonly actorId: PlayerId;
      readonly previousTableMultiplier: TableMultiplier;
      readonly currentTableMultiplier: TableMultiplier;
      readonly privilegeUsed: boolean;
    })
  | (RoundEventBase & {
      readonly type: "roundResultCommitted";
      readonly result: RoundResultV1;
    })
  | (RoundEventBase & {
      readonly type: "roundTransitionPrepared";
      readonly nextRound: NextRoundPlanV1;
    })
  | (RoundEventBase & {
      readonly type: "matchCompleted";
      readonly result: MatchResultV1;
    });

export type GameplayEventV1 = TurnEventV1 | RoundEventV1;

export interface GameplayTransitionV1 {
  readonly state: AuthoritativeGameStateV1;
  readonly events: readonly GameplayEventV1[];
}

export interface RoundAdvanceTransitionV1 {
  readonly state: AuthoritativeGameStateV1;
  readonly events: readonly (SetupEventV1 | RoundEventV1)[];
  readonly checkpoint: EngineCheckpointV1;
}
