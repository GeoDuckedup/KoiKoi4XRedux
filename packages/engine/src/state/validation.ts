import { CARD_IDS, getCardDefinition, isCardId, type CardId } from "../cards/catalog";
import { evaluateOpeningOutcome } from "../rules/opening-outcomes";
import { MATCH_LENGTHS, PLAYER_IDS, type AuthoritativeGameStateV1 } from "./types";

export interface StateValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

function issue(code: string, path: string, message: string): StateValidationIssue {
  return Object.freeze({ code, path, message });
}

function otherPlayerId(playerId: (typeof PLAYER_IDS)[number]): (typeof PLAYER_IDS)[number] {
  return playerId === PLAYER_IDS[0] ? PLAYER_IDS[1] : PLAYER_IDS[0];
}

function expectedActivePlayer(
  state: AuthoritativeGameStateV1,
  phaseKind: "awaitingHandPlay" | "awaitingDrawCapture",
): (typeof PLAYER_IDS)[number] | null {
  if (!PLAYER_IDS.includes(state.round.starterId)) return null;
  const starterId = state.round.starterId;
  const opponentId = otherPlayerId(starterId);
  const starterHandCount = state.players.find((player) => player.id === starterId)?.hand.length;
  const opponentHandCount = state.players.find((player) => player.id === opponentId)?.hand.length;
  if (starterHandCount === undefined || opponentHandCount === undefined) return null;
  const handsEqual = starterHandCount === opponentHandCount;
  const starterHasPlayedOneMore = starterHandCount + 1 === opponentHandCount;
  if (phaseKind === "awaitingHandPlay") {
    return handsEqual ? starterId : starterHasPlayedOneMore ? opponentId : null;
  }
  return starterHasPlayedOneMore ? starterId : handsEqual ? opponentId : null;
}

function authoritativeCardZones(state: AuthoritativeGameStateV1): readonly {
  path: string;
  cards: readonly CardId[];
}[] {
  const zones = [
    { path: "$.players[0].hand", cards: state.players[0].hand },
    { path: "$.players[1].hand", cards: state.players[1].hand },
    { path: "$.round.field", cards: state.round.field },
    { path: "$.round.drawPile", cards: state.round.drawPile },
    { path: "$.players[0].captured", cards: state.players[0].captured },
    { path: "$.players[1].captured", cards: state.players[1].captured },
  ];
  return state.phase.kind === "awaitingDrawCapture"
    ? [
        ...zones,
        { path: "$.phase.drawnCardId", cards: [state.phase.drawnCardId] as readonly CardId[] },
      ]
    : zones;
}

export function validateCardOwnership(
  state: AuthoritativeGameStateV1,
): readonly StateValidationIssue[] {
  const issues: StateValidationIssue[] = [];
  const seen = new Map<string, string>();
  let count = 0;
  for (const zone of authoritativeCardZones(state)) {
    for (const [index, cardId] of zone.cards.entries()) {
      count += 1;
      if (!isCardId(cardId)) {
        issues.push(
          issue("CARD_ZONE_UNKNOWN_ID", `${zone.path}[${index}]`, `Unknown CardId ${cardId}.`),
        );
        continue;
      }
      const previousPath = seen.get(cardId);
      if (previousPath !== undefined) {
        issues.push(
          issue(
            "CARD_ZONE_DUPLICATE",
            `${zone.path}[${index}]`,
            `${cardId} already exists at ${previousPath}.`,
          ),
        );
      } else {
        seen.set(cardId, `${zone.path}[${index}]`);
      }
    }
  }
  if (count !== CARD_IDS.length) {
    issues.push(
      issue("CARD_ZONE_COUNT", "$", `Authoritative zones contain ${count} cards instead of 48.`),
    );
  }
  for (const cardId of CARD_IDS) {
    if (!seen.has(cardId)) {
      issues.push(issue("CARD_ZONE_MISSING", "$", `Missing canonical card ${cardId}.`));
    }
  }
  return Object.freeze(issues);
}

export function validateAuthoritativeState(
  state: AuthoritativeGameStateV1,
): readonly StateValidationIssue[] {
  const issues = [...validateCardOwnership(state)];
  if (state.formatVersion !== 1 || state.rulesVersion !== "1.0") {
    issues.push(issue("STATE_FORMAT_INVALID", "$", "Unsupported state or rules version."));
  }
  if (!Number.isSafeInteger(state.stateVersion) || state.stateVersion < 1) {
    issues.push(
      issue("STATE_VERSION_INVALID", "$.stateVersion", "State version must be a positive integer."),
    );
  }
  if (
    state.status !== "inProgress" ||
    state.matchId.trim().length === 0 ||
    state.lastAcceptedCommandId.trim().length === 0
  ) {
    issues.push(
      issue(
        "MATCH_STATE_INVALID",
        "$",
        "Active gameplay state must identify an in-progress match.",
      ),
    );
  }
  if (!MATCH_LENGTHS.includes(state.matchLength)) {
    issues.push(
      issue("MATCH_LENGTH_INVALID", "$.matchLength", "Match length must be 3, 6, or 12."),
    );
  }
  if (
    state.players.length !== 2 ||
    state.players[0].id !== PLAYER_IDS[0] ||
    state.players[1].id !== PLAYER_IDS[1]
  ) {
    issues.push(issue("PLAYER_ID_INVALID", "$.players", "Player positions must be canonical."));
  }
  for (const [index, player] of state.players.entries()) {
    if (!Number.isSafeInteger(player.score) || player.score < 0) {
      issues.push(
        issue("PLAYER_SCORE_INVALID", `$.players[${index}].score`, "Score must be nonnegative."),
      );
    }
    if (player.hand.length > 8) {
      issues.push(
        issue(
          "PLAYER_HAND_COUNT_INVALID",
          `$.players[${index}].hand`,
          "Hand size must be 0 through 8.",
        ),
      );
    }
  }
  if (
    !Number.isSafeInteger(state.round.roundNumber) ||
    state.round.roundNumber < 1 ||
    state.round.roundNumber > state.matchLength ||
    state.round.scheduledMonth !== state.round.roundNumber
  ) {
    issues.push(
      issue(
        "ROUND_SCHEDULE_INVALID",
        "$.round",
        "Round number and scheduled month must align within the match length.",
      ),
    );
  }
  if (state.round.isFinalScheduledRound !== (state.round.roundNumber === state.matchLength)) {
    issues.push(
      issue(
        "FINAL_ROUND_FLAG_INVALID",
        "$.round.isFinalScheduledRound",
        "Final-round flag must match the configured last scheduled round.",
      ),
    );
  }
  if (!PLAYER_IDS.includes(state.round.starterId)) {
    issues.push(issue("STARTER_INVALID", "$.round.starterId", "Starter must be a match player."));
  }
  if (![1, 2, 3, 4].includes(state.round.tableMultiplier)) {
    issues.push(
      issue("TABLE_MULTIPLIER_INVALID", "$.round.tableMultiplier", "Table must be 1× through 4×."),
    );
  }

  const totalHandCards = state.players[0].hand.length + state.players[1].hand.length;
  const handCardsPlayed = 16 - totalHandCards;
  const drawCardsRevealed = 24 - state.round.drawPile.length;
  if (
    (state.phase.kind === "awaitingHandPlay" ||
      state.phase.kind === "awaitingDrawCapture" ||
      state.phase.kind === "awaitingEndOfPlayResolution") &&
    (handCardsPlayed < 0 || handCardsPlayed > 16 || handCardsPlayed !== drawCardsRevealed)
  ) {
    issues.push(
      issue(
        "TURN_CARD_PROGRESS_INVALID",
        "$.round",
        "Normal-turn hand plays and draw reveals must advance together.",
      ),
    );
  }

  if (state.phase.kind === "awaitingHandPlay") {
    const playerId = state.phase.playerId;
    if (!PLAYER_IDS.includes(playerId)) {
      issues.push(issue("PHASE_PLAYER_INVALID", "$.phase.playerId", "Active player is invalid."));
    } else if (state.players.find((player) => player.id === playerId)?.hand.length === 0) {
      issues.push(
        issue(
          "PHASE_PLAYER_HAND_EMPTY",
          "$.phase.playerId",
          "Active player must have a hand card.",
        ),
      );
    }
    if (playerId !== expectedActivePlayer(state, "awaitingHandPlay")) {
      issues.push(
        issue(
          "TURN_PLAYER_ORDER_INVALID",
          "$.phase.playerId",
          "Active player must follow starter order and completed hand plays.",
        ),
      );
    }
  } else if (state.phase.kind === "awaitingDrawCapture") {
    const targets = state.phase.targetFieldCardIds;
    if (!PLAYER_IDS.includes(state.phase.playerId)) {
      issues.push(issue("PHASE_PLAYER_INVALID", "$.phase.playerId", "Active player is invalid."));
    }
    if (state.phase.playerId !== expectedActivePlayer(state, "awaitingDrawCapture")) {
      issues.push(
        issue(
          "TURN_PLAYER_ORDER_INVALID",
          "$.phase.playerId",
          "Pending draw actor must be the player whose hand play opened this turn.",
        ),
      );
    }
    if (
      targets.length !== 2 ||
      targets[0] === targets[1] ||
      !isCardId(state.phase.drawnCardId) ||
      !targets.every(isCardId)
    ) {
      issues.push(
        issue(
          "DRAW_CAPTURE_PHASE_INVALID",
          "$.phase",
          "Pending draw choice must contain one known draw and two unique known targets.",
        ),
      );
    } else if (state.round.field.every(isCardId)) {
      const drawMonth = getCardDefinition(state.phase.drawnCardId).month;
      const expectedTargets = state.round.field.filter(
        (cardId) => getCardDefinition(cardId).month === drawMonth,
      );
      if (JSON.stringify(targets) !== JSON.stringify(expectedTargets)) {
        issues.push(
          issue(
            "DRAW_CAPTURE_TARGETS_INVALID",
            "$.phase.targetFieldCardIds",
            "Pending targets must be the exact two same-month field cards in field order.",
          ),
        );
      }
    } else {
      issues.push(
        issue(
          "DRAW_CAPTURE_PHASE_INVALID",
          "$.phase",
          "Pending draw choice cannot reference a malformed field.",
        ),
      );
    }
  } else if (state.phase.kind === "awaitingEndOfPlayResolution") {
    if (
      !PLAYER_IDS.includes(state.phase.lastActorId) ||
      (PLAYER_IDS.includes(state.round.starterId) &&
        state.phase.lastActorId !== otherPlayerId(state.round.starterId)) ||
      totalHandCards !== 0 ||
      state.round.drawPile.length !== 8
    ) {
      issues.push(
        issue(
          "END_OF_PLAY_PHASE_INVALID",
          "$.phase",
          "End-of-Play handoff requires a canonical last actor, empty hands, and eight unused draws.",
        ),
      );
    }
  }
  return Object.freeze(issues);
}

export function validateInitialSetupState(
  state: AuthoritativeGameStateV1,
): readonly StateValidationIssue[] {
  const ownershipIssues = validateCardOwnership(state);
  const issues = [...ownershipIssues];
  if (state.formatVersion !== 1 || state.rulesVersion !== "1.0") {
    issues.push(issue("STATE_VERSION_INVALID", "$", "Unsupported state or rules version."));
  }
  if (state.stateVersion !== 1) {
    issues.push(
      issue("STATE_VERSION_INVALID", "$.stateVersion", "Initial state version must be 1."),
    );
  }
  if (
    state.status !== "inProgress" ||
    state.matchId.trim().length === 0 ||
    state.lastAcceptedCommandId.trim().length === 0 ||
    state.history.length !== 0
  ) {
    issues.push(
      issue(
        "SETUP_MATCH_STATE_INVALID",
        "$",
        "A new match must be in progress, identified, and have empty history.",
      ),
    );
  }
  if (!MATCH_LENGTHS.includes(state.matchLength)) {
    issues.push(
      issue("MATCH_LENGTH_INVALID", "$.matchLength", "Match length must be 3, 6, or 12."),
    );
  }
  if (
    state.players.length !== 2 ||
    state.players[0].id !== PLAYER_IDS[0] ||
    state.players[1].id !== PLAYER_IDS[1]
  ) {
    issues.push(issue("PLAYER_ID_INVALID", "$.players", "Player positions must be canonical."));
  }
  for (const [index, player] of state.players.entries()) {
    if (!Number.isSafeInteger(player.score) || player.score < 0) {
      issues.push(
        issue("PLAYER_SCORE_INVALID", `$.players[${index}].score`, "Score must be nonnegative."),
      );
    }
    if (player.hand.length !== 8) {
      issues.push(
        issue("SETUP_HAND_COUNT", `$.players[${index}].hand`, "Initial hand must contain 8 cards."),
      );
    }
    if (player.captured.length !== 0) {
      issues.push(
        issue(
          "SETUP_CAPTURE_NOT_EMPTY",
          `$.players[${index}].captured`,
          "Initial captures must be empty.",
        ),
      );
    }
    if (player.seenYakuKeys.length !== 0) {
      issues.push(
        issue(
          "SETUP_YAKU_NOT_RESET",
          `$.players[${index}].seenYakuKeys`,
          "Initial seen-yaku keys must be empty.",
        ),
      );
    }
  }
  if (state.round.field.length !== 8) {
    issues.push(issue("SETUP_FIELD_COUNT", "$.round.field", "Initial field must contain 8 cards."));
  }
  if (state.round.drawPile.length !== 24) {
    issues.push(
      issue(
        "SETUP_DRAW_PILE_COUNT",
        "$.round.drawPile",
        "Initial draw pile must contain 24 cards.",
      ),
    );
  }
  if (state.round.roundNumber !== 1 || state.round.scheduledMonth !== 1) {
    issues.push(
      issue("SCHEDULED_MONTH_MISMATCH", "$.round", "A new match must begin with January round 1."),
    );
  }
  if (state.round.isFinalScheduledRound) {
    issues.push(
      issue(
        "FINAL_ROUND_FLAG_INVALID",
        "$.round.isFinalScheduledRound",
        "Round 1 is not final for supported match lengths.",
      ),
    );
  }
  if (!PLAYER_IDS.includes(state.round.starterId)) {
    issues.push(issue("STARTER_INVALID", "$.round.starterId", "Starter must be a match player."));
  }
  if (
    state.round.tableMultiplier !== 1 ||
    state.round.mostRecentKoiKoiCallerId !== null ||
    state.round.firstYakuTriggerPlayerId !== null ||
    state.round.specialPrivilege !== null ||
    state.round.frozenFinalRoundLeaderId !== null
  ) {
    issues.push(
      issue("SETUP_ROUND_NOT_RESET", "$.round", "Round-local setup state was not reset."),
    );
  }
  if (state.phase.kind === "awaitingHandPlay") {
    if (state.phase.playerId !== state.round.starterId) {
      issues.push(
        issue(
          "PHASE_PLAYER_INVALID",
          "$.phase.playerId",
          "Starter must be the first active player.",
        ),
      );
    }
  }

  const expectedOutcome = ownershipIssues.some((entry) => entry.code === "CARD_ZONE_UNKNOWN_ID")
    ? null
    : evaluateOpeningOutcome(state.round.field, [state.players[0].hand, state.players[1].hand]);
  const savedOutcome = state.phase.kind === "roundComplete" ? state.phase.result : null;
  if (JSON.stringify(savedOutcome) !== JSON.stringify(expectedOutcome)) {
    issues.push(
      issue(
        "OPENING_RESULT_EVIDENCE_MISMATCH",
        "$.phase",
        "Opening phase, result, and evidence must match the dealt cards.",
      ),
    );
  }

  const expectedScores = expectedOutcome?.pointDeltas ?? { "player-a": 0, "player-b": 0 };
  if (
    state.players[0].score !== expectedScores["player-a"] ||
    state.players[1].score !== expectedScores["player-b"]
  ) {
    issues.push(
      issue(
        "OPENING_RESULT_SCORE_INVALID",
        "$.players",
        "Initial scores must equal the committed automatic opening point deltas.",
      ),
    );
  }
  return Object.freeze(issues);
}

export function assertValidAuthoritativeState(state: AuthoritativeGameStateV1): void {
  const issues = validateAuthoritativeState(state);
  if (issues.length > 0) {
    throw new Error(
      `STATE_INVARIANT_FAILED:\n${issues.map((entry) => `${entry.code} ${entry.path}: ${entry.message}`).join("\n")}`,
    );
  }
}

export function assertValidInitialSetupState(state: AuthoritativeGameStateV1): void {
  const issues = validateInitialSetupState(state);
  if (issues.length > 0) {
    throw new Error(
      `STATE_INVARIANT_FAILED:\n${issues.map((entry) => `${entry.code} ${entry.path}: ${entry.message}`).join("\n")}`,
    );
  }
}
