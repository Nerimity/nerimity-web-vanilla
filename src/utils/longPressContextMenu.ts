import { closestFromEvent } from "./dom";

export const setupLongPressContextMenu = (opts: {
  el: HTMLElement;
  signal: AbortSignal;
  selector: string;
  open: (event: MouseEvent, target: HTMLElement) => boolean | void;
  delay?: number;
  movementThreshold?: number;
}) => {
  const delay = opts.delay ?? 500;
  const movementThreshold = opts.movementThreshold ?? 5;

  let touch:
    | {
        id: number;
        target: HTMLElement;
        x: number;
        y: number;
        ready: boolean;
        moved: boolean;
        timer: ReturnType<typeof setTimeout>;
      }
    | undefined;
  let activeTouchId: number | undefined;
  let ignoreNativeContextMenuUntil = 0;
  let suppressNextClick = false;
  let suppressClickTimer: ReturnType<typeof setTimeout> | undefined;

  const clearTouch = () => {
    if (touch) clearTimeout(touch.timer);
    touch = undefined;
    activeTouchId = undefined;
  };

  opts.signal.addEventListener(
    "abort",
    () => {
      clearTouch();
      if (suppressClickTimer) clearTimeout(suppressClickTimer);
      suppressNextClick = false;
    },
    { once: true },
  );

  opts.el.addEventListener(
    "contextmenu",
    (event) => {
      if (
        activeTouchId !== undefined ||
        Date.now() < ignoreNativeContextMenuUntil
      ) {
        event.preventDefault();
        return;
      }

      const target = closestFromEvent<HTMLElement>(event, opts.selector);
      if (target) opts.open(event, target);
    },
    { signal: opts.signal },
  );

  opts.el.addEventListener(
    "click",
    (event) => {
      if (!suppressNextClick) return;
      suppressNextClick = false;
      if (suppressClickTimer) {
        clearTimeout(suppressClickTimer);
        suppressClickTimer = undefined;
      }
      event.preventDefault();
      event.stopPropagation();
    },
    { signal: opts.signal, capture: true },
  );

  opts.el.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length !== 1) {
        clearTouch();
        return;
      }

      const target = closestFromEvent<HTMLElement>(event, opts.selector);
      const startTouch = event.changedTouches[0];
      if (!target || !startTouch) return;

      clearTouch();
      activeTouchId = startTouch.identifier;
      touch = {
        id: startTouch.identifier,
        target,
        x: startTouch.clientX,
        y: startTouch.clientY,
        ready: false,
        moved: false,
        timer: setTimeout(() => {
          if (touch) touch.ready = true;
        }, delay),
      };
    },
    { signal: opts.signal, passive: true },
  );

  document.addEventListener(
    "touchmove",
    (event) => {
      if (!touch || touch.moved) return;
      if (event.touches.length !== 1) {
        touch.moved = true;
        clearTimeout(touch.timer);
        return;
      }
      const currentTouch = Array.from(event.touches).find(
        (item) => item.identifier === touch?.id,
      );
      if (!currentTouch) return;
      if (
        Math.hypot(
          currentTouch.clientX - touch.x,
          currentTouch.clientY - touch.y,
        ) < movementThreshold
      ) {
        return;
      }

      touch.moved = true;
      clearTimeout(touch.timer);
    },
    { signal: opts.signal, passive: true },
  );

  document.addEventListener(
    "touchend",
    (event) => {
      if (!touch) return;
      const endedTouch = Array.from(event.changedTouches).find(
        (item) => item.identifier === touch?.id,
      );
      if (!endedTouch) return;

      const completedTouch = touch;
      clearTouch();
      ignoreNativeContextMenuUntil = Date.now() + 800;
      if (!completedTouch.ready || completedTouch.moved) return;

      const didOpen = opts.open(
        new MouseEvent("contextmenu", {
          clientX: completedTouch.x,
          clientY: completedTouch.y,
        }),
        completedTouch.target,
      );
      if (didOpen === false) return;

      suppressNextClick = true;
      if (suppressClickTimer) clearTimeout(suppressClickTimer);
      suppressClickTimer = setTimeout(() => {
        suppressNextClick = false;
        suppressClickTimer = undefined;
      }, 1000);
    },
    { signal: opts.signal },
  );

  document.addEventListener(
    "touchcancel",
    () => {
      if (!touch) return;
      clearTouch();
      ignoreNativeContextMenuUntil = Date.now() + 800;
    },
    { signal: opts.signal },
  );
};
