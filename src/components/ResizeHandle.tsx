import { isMobileWidth } from "../config";
import type { LocalStorageKeys } from "../utils/localStorage";
import { createResizeObserver } from "../utils/observer";

import style from "./ResizeHandle.module.css";

const WIDTH = 2;
export const createResizeHandler = (opts: {
  signal: AbortSignal;
  position: "left" | "right";
  store: LocalStorageKeys;
  initial: number;
  min?: number;
  max?: number;
}) => {
  const min = opts.min ?? 0;
  const max = Math.max(opts.max ?? Infinity, min);
  let mobile: boolean | null = null;
  let container: HTMLDivElement | null = null;
  let isDragging = false;
  let startX = 0;
  let startWidth = 0;
  const element = (
    <div
      style={{ "--width": `${WIDTH}px` }}
      class={[
        style.resizeHandle,
        opts.position === "left" ? style.left : style.right,
      ]}
    ></div>
  ) as HTMLDivElement;

  const handleResize = () => {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const left = rect.left;
    const right = rect.right;

    if (opts.position === "left") {
      element.style.left = `${left - WIDTH / 2}px`;
    } else {
      element.style.left = `${right - WIDTH / 2}px`;
    }
  };

  const setDesktopWidth = () => {
    if (!container) return;
    const storedWidth = Number(localStorage.getItem(opts.store));
    const width =
      Number.isFinite(storedWidth) && storedWidth > 0
        ? storedWidth
        : opts.initial;
    container.style.width = `${Math.min(Math.max(width, min), max)}px`;
  };

  const updateViewport = () => {
    if (!container) return;
    const wasMobile = mobile;
    mobile = isMobileWidth();

    element.classList.toggle(style.mobileHidden!, mobile);
    if (mobile) {
      container.style.width = "";
    } else if (wasMobile !== false) {
      container.classList.add(style.resizing!);
      setDesktopWidth();
      container.classList.remove(style.resizing!);
    }
    if (mobile && wasMobile === false && isDragging) {
      isDragging = false;
      element.classList.remove(style.visible!);
      container.classList.remove(style.resizing!);
    }
    handleResize();
  };

  requestAnimationFrame(() => {
    if (opts.signal.aborted) return;
    container = element.parentElement as HTMLDivElement;

    updateViewport();

    createResizeObserver(container, () => handleResize(), {
      signal: opts.signal,
    });

    window.addEventListener("resize", updateViewport, {
      signal: opts.signal,
    });
  });

  element.addEventListener(
    "mousedown",
    (event) => {
      if (!container || mobile) return;
      event.preventDefault();
      element.classList.add(style.visible!);
      isDragging = true;
      startX = event.clientX;
      startWidth = container.offsetWidth;
      container.classList.add(style.resizing!);
    },
    { signal: opts.signal },
  );

  document.addEventListener(
    "mousemove",
    (event) => {
      if (!isDragging || mobile) return;
      if (!container) return;
      const deltaX = event.clientX - startX;
      const width = startWidth + (opts.position === "left" ? -deltaX : deltaX);
      container.style.width = `${Math.min(Math.max(width, min), max)}px`;
      handleResize();
    },
    { signal: opts.signal, passive: true },
  );

  document.addEventListener(
    "mouseup",
    () => {
      if (!isDragging || !container) return;
      element.classList.remove(style.visible!);
      container.classList.remove(style.resizing!);
      isDragging = false;
      localStorage.setItem(opts.store, container.offsetWidth.toString());
    },
    { signal: opts.signal },
  );

  return {
    element,
  };
};
