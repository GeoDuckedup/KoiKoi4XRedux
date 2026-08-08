import type { BootSnapshot } from "../app/boot-state";

declare global {
  interface Window {
    __KOIKOI4X_READY__: boolean;
    advanceTime: (milliseconds: number) => void;
    render_game_to_text: () => string;
    __KOIKOI4X_SNAPSHOT__: () => BootSnapshot;
  }
}

export {};
