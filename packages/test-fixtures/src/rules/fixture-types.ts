export interface FixtureStateExpectations {
  readonly openingKind: "normal" | "fieldCancellation" | "luckyWin" | "bothLuckyDraw";
  readonly reasonCode:
    | null
    | "FIELD_FOUR_MONTH_CANCELLED"
    | "LUCKY_FOUR_MONTH"
    | "LUCKY_FOUR_PAIRS"
    | "BOTH_LUCKY_DRAW";
  readonly winnerId: "player-a" | "player-b" | null;
  readonly pointDeltas: Readonly<{ "player-a": number; "player-b": number }>;
  readonly completeEvidenceMonths: readonly number[];
  readonly evidencePlayerIds: readonly ("player-a" | "player-b")[];
  readonly ordinaryYakuPoints: 0;
}

export interface FixtureEventExpectation {
  readonly type: string;
  readonly audience: "public" | "private" | "serverOnly";
}

export interface FixtureVisibilityExpectations {
  readonly publicBeforeCommitContainsLuckyEvidence: boolean;
  readonly publicEvidencePlayerIdsAfterCommit: readonly ("player-a" | "player-b")[];
}

export interface RuleFixtureSpec<Given, Action> {
  readonly id: string;
  readonly ruleRefs: readonly string[];
  readonly description: string;
  readonly given: Given;
  readonly when: readonly Action[];
  readonly then: {
    readonly state: FixtureStateExpectations;
    readonly events: readonly FixtureEventExpectation[];
    readonly visibility?: FixtureVisibilityExpectations;
  };
}
