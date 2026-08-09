/** Pure domain code. Browser, rendering, persistence, and networking dependencies are forbidden. */
export const ENGINE_PACKAGE_ID = "@koikoi4x/engine" as const;

export * from "./cards/catalog";
export * from "./cards/months";
export * from "./cards/types";
export * from "./cards/validate-card-catalog";
export * from "./random/shuffle";
export * from "./random/types";
export * from "./random/xoshiro128ss";
export * from "./rules/opening-outcomes";
export * from "./rules/round-setup";
export * from "./state/types";
export * from "./state/validation";
