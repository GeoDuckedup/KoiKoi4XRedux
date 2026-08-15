import {
  evaluateYaku,
  getCardDefinition,
  YAKU_TRIGGER_KEYS,
  type YakuTriggerKey,
} from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import { YAKU_GUIDE_ENTRIES, YAKU_GUIDE_GROUPS, YAKU_GUIDE_NOTES } from "../src/game/yaku-guide";

describe("Phase 3F-E static Yaku Guide", () => {
  it("covers each canonical yaku once with frozen canonical threshold examples", () => {
    expect(YAKU_GUIDE_ENTRIES.map(({ key }) => key)).toEqual(YAKU_TRIGGER_KEYS);
    expect(new Set(YAKU_GUIDE_ENTRIES.map(({ key }) => key)).size).toBe(YAKU_TRIGGER_KEYS.length);

    for (const entry of YAKU_GUIDE_ENTRIES) {
      expect(Object.isFrozen(entry)).toBe(true);
      expect(Object.isFrozen(entry.exampleCardIds)).toBe(true);
      expect(entry.exampleCardIds.length).toBeGreaterThan(0);
      for (const cardId of entry.exampleCardIds) {
        expect(getCardDefinition(cardId).id).toBe(cardId);
      }

      const active = evaluateYaku(entry.exampleCardIds, entry.scheduledMonth).activeYaku.find(
        ({ key }) => key === entry.key,
      );
      expect(active).toEqual({ key: entry.key, name: entry.title, points: entry.points });
    }
  });

  it("uses only canonical key groups and recursively frozen reference content", () => {
    const canonicalKeys = new Set<YakuTriggerKey>(YAKU_TRIGGER_KEYS);
    const groupIds = new Set(YAKU_GUIDE_GROUPS.map(({ id }) => id));
    expect(Object.isFrozen(YAKU_GUIDE_ENTRIES)).toBe(true);
    expect(Object.isFrozen(YAKU_GUIDE_GROUPS)).toBe(true);
    expect(Object.isFrozen(YAKU_GUIDE_NOTES)).toBe(true);
    expect(YAKU_GUIDE_ENTRIES.every(({ key }) => canonicalKeys.has(key))).toBe(true);
    expect(YAKU_GUIDE_ENTRIES.every(({ group }) => groupIds.has(group))).toBe(true);
    expect(YAKU_GUIDE_NOTES.every((note) => note.length > 0)).toBe(true);
  });
});
