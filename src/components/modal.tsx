import { mobileWidth } from "../config";
import { h } from "../h";
import { createResizeObserver } from "../utils/observer";
import { portalElement } from "../utils/portal";
import { Button } from "./button";
import { Icon } from "./icon";

import style from "./modal.module.css";

type ModalAnchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

const modalStack: Array<{ destroy: () => void }> = [];
const pushModal = (entry: { destroy: () => void }) => modalStack.push(entry);
const popModal = (entry: { destroy: () => void }) => {
  const idx = modalStack.lastIndexOf(entry);
  if (idx !== -1) modalStack.splice(idx, 1);
};
const isTopModal = (entry: { destroy: () => void }) =>
  modalStack[modalStack.length - 1] === entry;

const Root = (props: {
  children: any;
  pos?: { x: string; y: string; anchor?: ModalAnchor };
}) => {
  const anchorOffsetX = () => {
    const a = props.pos?.anchor ?? "top-left";
    if (a === "top-center" || a === "bottom-center" || a === "center")
      return "-50%";
    if (a === "center-right" || a === "top-right" || a === "bottom-right")
      return "-100%";
    return "0%";
  };
  const anchorOffsetY = () => {
    const a = props.pos?.anchor ?? "top-left";
    if (a === "center-left" || a === "center-right" || a === "center")
      return "-50%";
    if (a === "bottom-left" || a === "bottom-center" || a === "bottom-right")
      return "-100%";
    return "0%";
  };
  return (
    <div class={style.modalBackdrop}>
      <div
        class={[style.modalRoot, "modalRoot", props.pos && style.hasPos]}
        data-x={props.pos?.x}
        data-y={props.pos?.y}
        style={{
          "--x": props.pos?.x,
          "--y": props.pos?.y,
          "--anchor-x": anchorOffsetX(),
          "--anchor-y": anchorOffsetY(),
        }}
      >
        {props.children}
      </div>
    </div>
  );
};
const Header = (props: { label: string; icon?: string; alert?: boolean }) => {
  return (
    <div class={style.header} data-alert={props.alert}>
      {props.icon && <Icon class={style.icon} name={props.icon} />}
      <span class={style.label}>{props.label}</span>
      <Button class={style.closeButton} icon="close" hoverBorder alert />
    </div>
  );
};
const Body = (props: { children?: any; width?: string; maxWidth?: string }) => {
  return (
    <div
      class={[style.body, "modalBody", "scrollbarHover"]}
      style={{ "--width": props.width, "--max-width": props.maxWidth }}
    >
      {props.children}
    </div>
  );
};

const Footer = (props: { children: any }) => {
  return <div class={style.footer}>{props.children}</div>;
};

export const Modal = {
  Root,
  Header,
  Body,
  Footer,
};

export const createModal = (
  children: any,
  abortController: AbortController,
) => {
  const isMobileWidth = () => window.innerWidth < mobileWidth;
  const root = children() as HTMLElement;
  const modal = root.querySelector(`.${style.modalRoot}`) as HTMLDivElement;
  const footerElement = root.querySelector(
    `.${style.footer}`,
  ) as HTMLDivElement;
  const backdrop = root;
  const { signal } = abortController;

  const footerOriginalParent = footerElement?.parentElement;
  const footerPlaceholder = document.createComment("footer-placeholder");
  if (footerOriginalParent && footerElement) {
    footerOriginalParent.insertBefore(footerPlaceholder, footerElement);
  }

  if (footerElement) {
    modal.classList.add(style.hasFooter!);
  }

  const moveFooterToBackdrop = () => {
    if (!footerElement || footerElement.parentElement === backdrop) return;
    backdrop.appendChild(footerElement);
  };

  const restoreFooter = () => {
    if (!footerElement || !footerOriginalParent) return;
    if (footerElement.parentElement === footerOriginalParent) return;
    const referenceNode =
      footerPlaceholder.parentElement === footerOriginalParent
        ? footerPlaceholder
        : null;
    footerOriginalParent.insertBefore(footerElement, referenceNode);
    footerElement.style.transform = "";
  };

  const getWindowHeight = () => window.innerHeight;
  const getModalHeight = () => modal.offsetHeight;
  const getMinY = () => getWindowHeight() - getModalHeight();
  const getInitialY = () => initialY();
  const getFooterTranslateY = (value: number) =>
    Math.max(0, value - getInitialY());

  const updateFooterPosition = () => {
    if (isMobileWidth()) {
      moveFooterToBackdrop();
    } else {
      restoreFooter();
    }
  };

  const updateFooterTransform = () => {
    if (!footerElement || !isMobileWidth()) return;
    const offset = getFooterTranslateY(modalY);
    footerElement.style.transform = offset > 0 ? `translateY(${offset}px)` : "";
  };

  const animateFooter = (
    fromY: number,
    toY: number,
    options: KeyframeAnimationOptions,
  ) => {
    if (!footerElement || !isMobileWidth()) return null;

    const anim = footerElement.animate(
      [
        { transform: `translateY(${fromY}px)` },
        { transform: `translateY(${toY}px)` },
      ],
      options,
    );
    anim.onfinish = () => {
      footerElement.style.transform = `translateY(${toY}px)`;
      anim.cancel();
    };
    return anim;
  };

  const setModalY = (value: number) => {
    modalY = value;
    modal.style.transform = `translateY(${modalY}px)`;
    updateFooterTransform();
  };

  const animateElement = (
    element: Element,
    keyframes: Keyframe[] | PropertyIndexedKeyframes,
    options: KeyframeAnimationOptions,
    finish?: () => void,
  ) => {
    const anim = element.animate(keyframes, options);
    if (finish) {
      anim.onfinish = () => {
        finish();
        anim.commitStyles();
        anim.cancel();
      };
    }
    return anim;
  };

  const animateModalToY = (
    targetY: number,
    options: KeyframeAnimationOptions,
    onFinish?: () => void,
  ) => {
    return animateElement(
      modal,
      { transform: `translateY(${targetY}px)` },
      options,
      () => {
        setModalY(targetY);
        if (onFinish) onFinish();
      },
    );
  };

  const mobileModalAnimation: KeyframeAnimationOptions = {
    duration: 200,
    fill: "forwards",
    easing: "cubic-bezier(0.05, 0.7, 0.1, 1.0)",
  };

  const desktopModalAnimation: KeyframeAnimationOptions = {
    duration: 180,
    fill: "forwards",
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  };

  let modalY = 0;
  let startY = 0;
  let baseY = 0;

  let lastTouchY = 0;
  let lastTouchTime = 0;
  let velocityY = 0;
  let startedAtInitialPosition = false;
  let lastMobileWidth = isMobileWidth();

  let inertiaFrame: number | null = null;
  let lastInertiaTime = 0;

  const cancelInertia = () => {
    if (inertiaFrame !== null) {
      cancelAnimationFrame(inertiaFrame);
      inertiaFrame = null;
    }
  };

  const stackEntry = { destroy: () => {} };
  pushModal(stackEntry);

  window.addEventListener(
    "touchstart",
    (event) => {
      if (!isMobileWidth() || !isTopModal(stackEntry)) return;
      cancelInertia();

      const touch = event.touches[0];
      if (!touch) return;
      startY = touch.clientY;
      baseY = modalY;

      const currentInitialY = initialY();
      startedAtInitialPosition = Math.abs(modalY - currentInitialY) < 2;

      lastTouchY = touch.clientY;
      lastTouchTime = performance.now();
      velocityY = 0;
    },
    { signal, passive: true },
  );

  window.addEventListener(
    "touchmove",
    (event) => {
      if (!isMobileWidth() || !isTopModal(stackEntry)) return;
      const touch = event.touches[0];
      if (!touch) return;

      const currentTime = performance.now();
      const deltaY = touch.clientY - startY;
      let targetY = baseY + deltaY;

      const modalHeight = modal.offsetHeight;
      const windowHeight = window.innerHeight;
      const minY = windowHeight - modalHeight;

      if (targetY < minY) targetY = minY;
      if (targetY > windowHeight) targetY = windowHeight;

      const timeDelta = currentTime - lastTouchTime;
      if (timeDelta > 0) {
        velocityY = (touch.clientY - lastTouchY) / timeDelta;
      }

      lastTouchY = touch.clientY;
      lastTouchTime = currentTime;

      setModalY(targetY);
    },
    { signal, passive: true },
  );

  window.addEventListener(
    "touchend",
    () => {
      if (!isMobileWidth() || !isTopModal(stackEntry)) return;
      const windowHeight = window.innerHeight;
      const modalHeight = modal.offsetHeight;
      const minY = windowHeight - modalHeight;
      const currentInitialY = initialY();

      const velocityThreshold = 0.02;
      const closeVelocityThreshold = 0.7;
      const deceleration = 0.0035;

      const animateBackToInitial = () => {
        const startFooterOffset = getFooterTranslateY(modalY);
        modalY = currentInitialY;
        const targetFooterOffset = getFooterTranslateY(modalY);

        animateModalToY(modalY, mobileModalAnimation, () => {
          updateFooterTransform();
        });
        animateFooter(
          startFooterOffset,
          targetFooterOffset,
          mobileModalAnimation,
        );
      };

      const releaseAtBottom = modalY >= windowHeight - 1;
      if (releaseAtBottom) {
        destroy();
        return;
      }

      if (startedAtInitialPosition && velocityY > closeVelocityThreshold) {
        destroy();
        return;
      }

      if (Math.abs(velocityY) < velocityThreshold) {
        if (modalY > currentInitialY) {
          animateBackToInitial();
        }
        return;
      }

      if (modalY > currentInitialY) {
        animateBackToInitial();
        return;
      }

      const step = (now: number) => {
        if (inertiaFrame === null) return;

        const dt = now - lastInertiaTime;
        lastInertiaTime = now;
        const sign = Math.sign(velocityY);
        const decay = deceleration * dt;
        velocityY = Math.abs(velocityY) <= decay ? 0 : velocityY - sign * decay;

        let nextY = modalY + velocityY * dt;
        if (nextY >= currentInitialY) {
          nextY = currentInitialY;
          velocityY = 0;
        }
        if (nextY < minY) {
          nextY = minY;
          velocityY = 0;
        }
        if (nextY > windowHeight) {
          nextY = windowHeight;
          velocityY = 0;
        }

        setModalY(nextY);

        if (
          Math.abs(velocityY) < velocityThreshold ||
          modalY >= currentInitialY ||
          modalY <= minY
        ) {
          inertiaFrame = null;
          return;
        }

        inertiaFrame = requestAnimationFrame(step);
      };

      lastInertiaTime = performance.now();
      inertiaFrame = requestAnimationFrame(step);
    },
    { signal, passive: true },
  );

  const initialY = () => {
    const targetVisibility = 50;

    const modalHeight = getModalHeight();
    const windowHeight = getWindowHeight();
    const percentTakingScreen = (modalHeight / windowHeight) * 100;

    if (percentTakingScreen < targetVisibility) {
      return getMinY();
    } else {
      return windowHeight / 2;
    }
  };

  let lastWindowHeight = window.innerHeight;
  const initialPosition = () => {
    const windowHeight = window.innerHeight;
    lastWindowHeight = windowHeight;

    if (isMobileWidth()) {
      modalY = windowHeight;
      modal.style.transform = `translateY(${modalY}px)`;

      modalY = initialY();
      const startFooterOffset = getFooterTranslateY(windowHeight);
      const targetFooterOffset = getFooterTranslateY(modalY);
      updateFooterTransform();

      animateModalToY(modalY, mobileModalAnimation, () => {
        updateFooterTransform();
      });
      animateFooter(
        startFooterOffset,
        targetFooterOffset,
        mobileModalAnimation,
      );
      return;
    }

    modalY = 0;

    if (modal.classList.contains(style.hasPos!)) {
      clampPosition();
      modal.style.opacity = "0";
      const anim = modal.animate(
        [
          { transform: "translateY(20px)", opacity: 0 },
          { transform: "translateY(0)", opacity: 1 },
        ],
        desktopModalAnimation,
      );
      anim.onfinish = () => {
        modal.style.opacity = "";
        modal.style.transform = "";
        anim.cancel();
      };
      return;
    }

    modal.style.transform = "translateY(-20px)";
    modal.style.opacity = "0";
    const anim = modal.animate(
      [
        { transform: "translateY(20px)", opacity: 0 },
        { transform: "translateY(0)", opacity: 1 },
      ],
      desktopModalAnimation,
    );
    anim.onfinish = () => {
      anim.commitStyles();
      anim.cancel();
    };
  };
  requestAnimationFrame(initialPosition);

  let wheelTimeout: number | null = null;

  const handleScroll = (event: WheelEvent) => {
    if (!isMobileWidth() || !isTopModal(stackEntry)) return;
    cancelInertia();

    modalY = modalY - event.deltaY;

    const modalHeight = modal.offsetHeight;
    const windowHeight = window.innerHeight;
    const minY = windowHeight - modalHeight;

    if (modalY < minY) modalY = minY;
    if (modalY > windowHeight) modalY = windowHeight;

    setModalY(modalY);

    if (wheelTimeout) {
      clearTimeout(wheelTimeout);
    }

    wheelTimeout = window.setTimeout(() => {
      const currentVisibleHeight = windowHeight - modalY;

      const currentInitialY = initialY();
      const draggedDistance = modalY - currentInitialY;

      if (currentVisibleHeight <= 0) {
        destroy();
      } else if (draggedDistance > 0) {
        const startFooterOffset = getFooterTranslateY(modalY);
        modalY = currentInitialY;
        const targetFooterOffset = getFooterTranslateY(modalY);
        animateModalToY(modalY, mobileModalAnimation, () => {
          updateFooterTransform();
        });
        animateFooter(
          startFooterOffset,
          targetFooterOffset,
          mobileModalAnimation,
        );
      }
    }, 200);
  };

  const clampPosition = () => {
    if (!modal.classList.contains(style.hasPos!)) return;
    const rect = modal.getBoundingClientRect();

    const overflowLeft = Math.min(0, rect.left);
    const overflowTop = Math.min(0, rect.top);
    const overflowRight = Math.max(0, rect.right - window.innerWidth);
    const overflowBottom = Math.max(0, rect.bottom - window.innerHeight);

    const currentX = parseFloat(modal.style.getPropertyValue("--x")) || 0;
    const currentY = parseFloat(modal.style.getPropertyValue("--y")) || 0;

    modal.style.setProperty(
      "--x",
      `${currentX - overflowLeft - overflowRight}px`,
    );
    modal.style.setProperty(
      "--y",
      `${currentY - overflowTop - overflowBottom}px`,
    );
  };
  const handleResize = () => {
    clampPosition();

    const currentMobile = isMobileWidth();
    if (lastMobileWidth !== currentMobile) {
      lastMobileWidth = currentMobile;
      updateFooterPosition();
      if (!lastMobileWidth) {
        modal.style.transform = `initial`;
      } else {
        initialPosition();
      }
    }
    if (!currentMobile) return;
    const windowHeight = window.innerHeight;

    const distanceFromBottom = lastWindowHeight - modalY;

    modalY = windowHeight - distanceFromBottom;

    const modalHeight = modal.offsetHeight;
    const minY = windowHeight - modalHeight;
    if (modalY < minY) modalY = minY;
    if (modalY > windowHeight) modalY = windowHeight;

    setModalY(modalY);

    lastWindowHeight = windowHeight;
  };
  setTimeout(
    () => {
      createResizeObserver(modal, handleResize, { signal, defer: true });
    },
    isMobileWidth() ? 200 : 0,
  );

  window.addEventListener("resize", handleResize, {
    signal: abortController.signal,
    passive: true,
    capture: false,
  });

  window.addEventListener("wheel", handleScroll, {
    signal: abortController.signal,
    passive: false,
    capture: false,
  });

  let downX = 0;
  let downY = 0;
  backdrop.addEventListener(
    "mousedown",
    (e) => {
      downX = e.clientX;
      downY = e.clientY;
    },
    { signal },
  );

  backdrop.addEventListener(
    "click",
    (e) => {
      if (e.currentTarget === e.target) {
        const movedX = Math.abs(e.clientX - downX);
        const movedY = Math.abs(e.clientY - downY);
        if (movedX > 10 || movedY > 10) return;
        destroy();
      }
      const target = e.target as HTMLElement;
      const isCloseButton = target.closest(`.${style.closeButton}`);
      if (isCloseButton) {
        destroy();
        return;
      }
    },
    { signal },
  );

  updateFooterPosition();
  portalElement().appendChild(backdrop);

  let destroyed = false;
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;

    if (wheelTimeout) {
      clearTimeout(wheelTimeout);
      wheelTimeout = null;
    }
    cancelInertia();
    restoreFooter();
    popModal(stackEntry);

    backdrop.animate(
      { background: "rgba(0, 0, 0, 0)" },
      {
        duration: 200,
        fill: "forwards",
      },
    );

    const mobileExit = isMobileWidth();
    const exitOptions = mobileExit
      ? mobileModalAnimation
      : desktopModalAnimation;
    const modalAnim = modal.animate(
      mobileExit
        ? { transform: `translateY(${window.innerHeight}px)` }
        : { transform: `translateY(50px)`, opacity: 0 },
      exitOptions,
    );

    const startFooterOffset = footerElement ? getFooterTranslateY(modalY) : 0;
    const targetFooterOffset = Math.max(
      0,
      startFooterOffset + window.innerHeight - modalY,
    );
    if (mobileExit) {
      animateFooter(
        startFooterOffset,
        targetFooterOffset,
        mobileModalAnimation,
      );
    }

    modalAnim.onfinish = () => {
      abortController.abort();
      backdrop.remove();
    };
  };

  stackEntry.destroy = destroy;

  abortController.signal.addEventListener("abort", () => destroy(), {
    once: true,
  });

  return { destroy };
};
