import type { CardId } from "@koikoi4x/engine";

import type { SemanticCardControlV1 } from "./types";

export interface DomCardBridgeV1 {
  destroy: () => void;
  render: (controls: readonly SemanticCardControlV1[]) => void;
}

export function createDomCardBridge(input: {
  root: HTMLElement;
  onActivate: (cardId: CardId) => void;
  onCancel: () => void;
  onFocus: (cardId: CardId | null) => void;
}): DomCardBridgeV1 {
  const buttons = new Map<CardId, HTMLButtonElement>();
  let renderedOrder: readonly CardId[] = Object.freeze([]);
  let rendering = false;

  const moveFocus = (current: CardId, delta: number): void => {
    const index = renderedOrder.indexOf(current);
    if (index < 0 || renderedOrder.length === 0) return;
    const nextIndex = (index + delta + renderedOrder.length) % renderedOrder.length;
    const nextCardId = renderedOrder[nextIndex];
    if (nextCardId) buttons.get(nextCardId)?.focus();
  };

  const keydown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement) || !target.dataset.cardId) return;
    const cardId = target.dataset.cardId as CardId;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      input.onCancel();
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      moveFocus(cardId, 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      moveFocus(cardId, -1);
    } else if (event.key === "Home") {
      event.preventDefault();
      const firstCardId = renderedOrder[0];
      if (firstCardId) buttons.get(firstCardId)?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      const lastCardId = renderedOrder.at(-1);
      if (lastCardId) buttons.get(lastCardId)?.focus();
    }
  };
  input.root.addEventListener("keydown", keydown);

  return {
    render: (controls) => {
      rendering = true;
      try {
        const activeIds = new Set(controls.map(({ cardId }) => cardId));
        for (const [cardId, button] of buttons) {
          if (activeIds.has(cardId)) continue;
          buttons.delete(cardId);
          button.remove();
        }
        renderedOrder = Object.freeze(controls.map(({ cardId }) => cardId));
        for (const [index, control] of controls.entries()) {
          let button = buttons.get(control.cardId);
          if (!button) {
            button = document.createElement("button");
            button.type = "button";
            button.className = "card-input-control";
            button.dataset.cardId = control.cardId;
            button.addEventListener("click", () => input.onActivate(control.cardId));
            button.addEventListener("focus", () => {
              if (!rendering) input.onFocus(control.cardId);
            });
            button.addEventListener("blur", () => {
              if (!rendering) input.onFocus(null);
            });
            input.root.append(button);
            buttons.set(control.cardId, button);
          }
          button.dataset.inputRole = control.role;
          button.classList.toggle("card-input-control--selected", control.selected);
          button.classList.toggle("card-input-control--target", control.role === "target");
          button.classList.toggle("card-input-control--focused", control.focused);
          button.setAttribute("aria-label", control.ariaLabel);
          button.setAttribute("aria-pressed", String(control.selected));
          button.title = `${control.monthName} · ${control.category} · ${control.actionLabel}`;
          button.tabIndex =
            control.focused || (index === 0 && !controls.some(({ focused }) => focused)) ? 0 : -1;
          button.style.left = `${control.bounds.x}px`;
          button.style.top = `${control.bounds.y}px`;
          button.style.width = `${control.bounds.width}px`;
          button.style.height = `${control.bounds.height}px`;
        }
      } finally {
        rendering = false;
      }
    },
    destroy: () => {
      input.root.removeEventListener("keydown", keydown);
      input.root.replaceChildren();
      buttons.clear();
      renderedOrder = Object.freeze([]);
    },
  };
}
