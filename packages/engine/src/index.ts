/** Pure domain code. Browser, rendering, persistence, and networking dependencies are forbidden. */
export const ENGINE_PACKAGE_ID = "@koikoi4x/engine" as const;

export * from "./cards/catalog";
export * from "./cards/months";
export * from "./cards/types";
export * from "./cards/validate-card-catalog";
