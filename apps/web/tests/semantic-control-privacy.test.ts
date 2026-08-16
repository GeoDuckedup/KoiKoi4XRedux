import { describe, expect, it } from "vitest";

import { shouldClearSemanticControlsForPrivacy } from "../src/app/semantic-control-privacy";

describe("Phase 5B semantic-control privacy gates", () => {
  it("retains the inspector's DOM invoker for native focus restoration", () => {
    // An inspector still uses the interaction controller's external lock, but it
    // is not a privacy boundary and must not disconnect its originating button.
    expect(
      shouldClearSemanticControlsForPrivacy({
        localSavePromptOpen: false,
        privateHandoffPending: false,
      }),
    ).toBe(false);
  });

  it("removes semantic card identities for the persistence prompt and Ready cover", () => {
    expect(
      shouldClearSemanticControlsForPrivacy({
        localSavePromptOpen: true,
        privateHandoffPending: false,
      }),
    ).toBe(true);
    expect(
      shouldClearSemanticControlsForPrivacy({
        localSavePromptOpen: false,
        privateHandoffPending: true,
      }),
    ).toBe(true);
  });
});
