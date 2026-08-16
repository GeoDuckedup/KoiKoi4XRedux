/**
 * Only persistence/resume privacy gates remove DOM card controls entirely.
 * Ordinary utility locks keep their existing controls connected so native-dialog
 * focus restoration can return to the invoking card.
 */
export function shouldClearSemanticControlsForPrivacy(input: {
  readonly localSavePromptOpen: boolean;
  readonly privateHandoffPending: boolean;
}): boolean {
  return input.localSavePromptOpen || input.privateHandoffPending;
}
