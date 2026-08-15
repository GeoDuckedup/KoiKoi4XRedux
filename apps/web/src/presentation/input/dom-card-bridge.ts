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
  onInspect: (cardId: CardId, trigger: HTMLElement) => void;
}): DomCardBridgeV1 {
  const buttons = new Map<CardId, HTMLButtonElement>();
  let renderedOrder: readonly CardId[] = Object.freeze([]);
  let controlsByCardId = new Map<CardId, SemanticCardControlV1>();
  let rendering = false;
  let longPress: {
    cardId: CardId;
    pointerId: number;
    startX: number;
    startY: number;
    timer: number;
    button: HTMLButtonElement;
  } | null = null;
  let suppressNextClick: {
    cardId: CardId;
    pointerId: number;
    button: HTMLButtonElement;
    released: boolean;
  } | null = null;

  const releasePointerCapture = (button: HTMLButtonElement, pointerId: number): void => {
    try {
      if (button.hasPointerCapture(pointerId)) button.releasePointerCapture(pointerId);
    } catch {
      // Browsers may release capture while a native modal is opening.
    }
  };

  const cancelLongPress = (): void => {
    if (!longPress) return;
    const pending = longPress;
    window.clearTimeout(pending.timer);
    longPress = null;
    releasePointerCapture(pending.button, pending.pointerId);
  };

  const beginLongPress = (event: PointerEvent, cardId: CardId, button: HTMLButtonElement): void => {
    const control = controlsByCardId.get(cardId);
    if (!control?.inspectable || !event.isPrimary || event.button !== 0) return;
    // A new physical press is never the follow-up click belonging to a prior long press.
    suppressNextClick = null;
    cancelLongPress();
    try {
      button.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort; the normal in-bounds listeners still work as a fallback.
    }
    const timer = window.setTimeout(() => {
      if (!longPress || longPress.cardId !== cardId || longPress.pointerId !== event.pointerId)
        return;
      suppressNextClick = { cardId, pointerId: event.pointerId, button, released: false };
      longPress = null;
      input.onInspect(cardId, button);
    }, 475);
    longPress = {
      cardId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      timer,
      button,
    };
  };

  const finishPointer = (
    event: PointerEvent,
    button: HTMLButtonElement,
    cancelled: boolean,
  ): void => {
    if (longPress?.pointerId === event.pointerId) cancelLongPress();
    const suppression = suppressNextClick;
    if (!suppression || suppression.pointerId !== event.pointerId) {
      releasePointerCapture(button, event.pointerId);
      return;
    }
    releasePointerCapture(suppression.button, event.pointerId);
    if (cancelled) {
      suppressNextClick = null;
      return;
    }
    // The browser dispatches the activation click after pointerup in this interaction. Keep the
    // exact pointer's suppression through that click, then clear it before any later press.
    suppressNextClick = { ...suppression, released: true };
    window.requestAnimationFrame(() => {
      if (
        suppressNextClick?.pointerId === suppression.pointerId &&
        suppressNextClick.cardId === suppression.cardId &&
        suppressNextClick.released
      ) {
        suppressNextClick = null;
      }
    });
  };

  // Pointer capture keeps the normal path on its originating control. These document observers
  // also cover engines that release capture when a pointer travels outside the canvas/modal layer.
  const documentPointerMove = (event: PointerEvent): void => {
    if (!longPress || longPress.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - longPress.startX, event.clientY - longPress.startY) > 8) {
      cancelLongPress();
    }
  };
  const documentPointerEnd = (event: PointerEvent, cancelled: boolean): void => {
    const button =
      longPress?.pointerId === event.pointerId
        ? longPress.button
        : suppressNextClick?.pointerId === event.pointerId
          ? suppressNextClick.button
          : null;
    if (button) finishPointer(event, button, cancelled);
  };
  const documentPointerUp = (event: PointerEvent): void => documentPointerEnd(event, false);
  const documentPointerCancel = (event: PointerEvent): void => documentPointerEnd(event, true);
  document.addEventListener("pointermove", documentPointerMove);
  document.addEventListener("pointerup", documentPointerUp);
  document.addEventListener("pointercancel", documentPointerCancel);

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
    const control = controlsByCardId.get(cardId);
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      input.onCancel();
    } else if (
      control?.inspectable &&
      (event.key.toLowerCase() === "i" ||
        event.key === "ContextMenu" ||
        (event.shiftKey && event.key === "F10"))
    ) {
      event.preventDefault();
      event.stopPropagation();
      input.onInspect(cardId, target);
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
        const nextControlsByCardId = new Map(controls.map((control) => [control.cardId, control]));
        const longPressControl = longPress ? nextControlsByCardId.get(longPress.cardId) : null;
        const previousLongPressControl = longPress ? controlsByCardId.get(longPress.cardId) : null;
        if (
          !longPressControl ||
          longPressControl.locked ||
          previousLongPressControl?.observationStateVersion !==
            longPressControl.observationStateVersion
        ) {
          cancelLongPress();
        }
        const activeIds = new Set(controls.map(({ cardId }) => cardId));
        for (const [cardId, button] of buttons) {
          if (activeIds.has(cardId)) continue;
          buttons.delete(cardId);
          button.remove();
        }
        controlsByCardId = nextControlsByCardId;
        renderedOrder = Object.freeze(controls.map(({ cardId }) => cardId));
        for (const [index, control] of controls.entries()) {
          let button = buttons.get(control.cardId);
          if (!button) {
            const createdButton = document.createElement("button");
            button = createdButton;
            createdButton.type = "button";
            createdButton.className = "card-input-control";
            createdButton.dataset.cardId = control.cardId;
            createdButton.addEventListener("click", (event) => {
              if (suppressNextClick?.cardId === control.cardId && suppressNextClick.released) {
                event.preventDefault();
                suppressNextClick = null;
                return;
              }
              if (controlsByCardId.get(control.cardId)?.actionable)
                input.onActivate(control.cardId);
            });
            createdButton.addEventListener("pointerdown", (event) =>
              beginLongPress(event, control.cardId, createdButton),
            );
            createdButton.addEventListener("lostpointercapture", (event) => {
              if (longPress?.pointerId === event.pointerId) cancelLongPress();
            });
            createdButton.addEventListener("contextmenu", (event) => {
              if (!controlsByCardId.get(control.cardId)?.inspectable) return;
              event.preventDefault();
              cancelLongPress();
              suppressNextClick = null;
              input.onInspect(control.cardId, createdButton);
            });
            createdButton.addEventListener("focus", () => {
              if (!rendering && controlsByCardId.get(control.cardId)?.actionable) {
                input.onFocus(control.cardId);
              }
            });
            createdButton.addEventListener("blur", () => {
              if (!rendering && controlsByCardId.get(control.cardId)?.actionable)
                input.onFocus(null);
            });
            input.root.append(createdButton);
            buttons.set(control.cardId, createdButton);
          }
          button.dataset.inputRole = control.role;
          button.dataset.actionable = String(control.actionable);
          button.dataset.inspectable = String(control.inspectable);
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
      cancelLongPress();
      if (suppressNextClick) {
        releasePointerCapture(suppressNextClick.button, suppressNextClick.pointerId);
        suppressNextClick = null;
      }
      input.root.removeEventListener("keydown", keydown);
      document.removeEventListener("pointermove", documentPointerMove);
      document.removeEventListener("pointerup", documentPointerUp);
      document.removeEventListener("pointercancel", documentPointerCancel);
      input.root.replaceChildren();
      buttons.clear();
      controlsByCardId = new Map();
      renderedOrder = Object.freeze([]);
    },
  };
}
