import type { AuthoritativeGameStateV1 } from "./types";

/**
 * Transition-internal performance cache. This module is intentionally omitted
 * from the engine package export surface: only transition code may mark a
 * deep-frozen state after it has passed complete invariant validation.
 */
const trustedValidatedEngineStates = new WeakSet<object>();

export function isTrustedValidatedEngineState(state: AuthoritativeGameStateV1): boolean {
  return trustedValidatedEngineStates.has(state);
}

export function markTrustedValidatedEngineState(state: AuthoritativeGameStateV1): void {
  trustedValidatedEngineStates.add(state);
}
