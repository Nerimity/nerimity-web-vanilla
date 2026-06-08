import { css } from "@linaria/core";

import { mobileWidth } from "../config";
import { h } from "../h";
import { scoped } from "../utils/css";
import { createResizeObserver } from "../utils/observer";
import { portalElement } from "../utils/portal";
import { Button } from "./button";
import { Icon } from "./icon";

const modalBackdrop = css`
  background: rgba(0, 0, 0, 0.5);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1111111111111111;

  @media (max-width: ${`${mobileWidth}px`}) {
    align-items: start;
  }
`;
const modalRoot = css`
  display: flex;
  flex-direction: column;
  background: var(--background);
  border-radius: var(--radius-8);
  border: solid 1px var(--gray-700);
  max-height: 80vh;
  overflow: hidden;
  @media (max-width: ${`${mobileWidth}px`}) {
    flex-shrink: 0;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    max-height: initial;
    flex: 1;
    padding-bottom: 64px;
  }
`;
const header = css`
  display: flex;
  align-items: center;
  padding: 8px 10px;
  gap: 8px;
  color: var(--primary-color);
  .label {
    flex: 1;
  }
  .${scoped`closeButton`} {
    padding: 0px;
  }
  &[data-alert="true"] {
    color: var(--alert-color);
  }
`;

const body = css`
  display: flex;
  flex-direction: column;
  overflow: auto;
  margin-left: 12px;
  margin-right: 8px;
  @media (min-width: ${`${mobileWidth}px`}) {
    width: var(--width);
  }
  @media (max-width: ${`${mobileWidth}px`}) {
    flex: 1;
    width: initial;
  }
`;

const footer = css`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 10px;
  gap: 8px;
  @media (max-width: ${`${mobileWidth}px`}) {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    padding: 10px;
    background: var(--background);
    z-index: 1111111111111112;
    .button {
      flex: 1;
    }
  }
  .button {
    .icon {
      font-size: 18px;
    }
  }
`;

const Root = (props: { children: any }) => {
  return (
    <div class={modalBackdrop}>
      <div class={modalRoot}>{props.children}</div>
    </div>
  );
};
const Header = (props: { label: string; icon?: string; alert?: boolean }) => {
  return (
    <div class={header} data-alert={props.alert}>
      {props.icon && <Icon class="icon" name={props.icon} />}
      <span class="label">{props.label}</span>
      <Button class={scoped`closeButton`} icon="close" hoverBorder alert />
    </div>
  );
};
const Body = (props: { children?: any; width?: string }) => {
  return (
    <div class={[body, "scrollbarHover"]} style={{ "--width": props.width }}>
      {props.children}
    </div>
  );
};

const Footer = (props: { children: any }) => {
  return <div class={footer}>{props.children}</div>;
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
  const modal = root.querySelector(`.${modalRoot}`) as HTMLDivElement;
  const footerElement = root.querySelector(`.${footer}`) as HTMLDivElement;
  const backdrop = root;
  const { signal } = abortController;

  const footerOriginalParent = footerElement?.parentElement;
  const footerPlaceholder = document.createComment("footer-placeholder");
  if (footerOriginalParent && footerElement) {
    footerOriginalParent.insertBefore(footerPlaceholder, footerElement);
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

  window.addEventListener(
    "touchstart",
    (event) => {
      if (!isMobileWidth()) return;
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
      if (!isMobileWidth()) return;
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
      if (!isMobileWidth()) return;
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
    modal.style.transform = "translateY(-20px)";
    modal.style.opacity = "0";

    const anim = modal.animate(
      [
        { transform: "translateY(-20px)", opacity: 0 },
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
    if (!isMobileWidth()) return;
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

  const handleResize = () => {
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
  setTimeout(() => {
    createResizeObserver(modal, handleResize, { signal, defer: true });
  }, 200);

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

  modal.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement;
      const isCloseButton = target.closest(`.${scoped`closeButton`}`);
      if (isCloseButton) {
        destroy();
        return;
      }
    },
    { signal },
  );

  updateFooterPosition();
  portalElement().appendChild(backdrop);

  const destroy = () => {
    if (wheelTimeout) {
      clearTimeout(wheelTimeout);
      wheelTimeout = null;
    }
    cancelInertia();
    restoreFooter();

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
  abortController.signal.addEventListener("abort", () => destroy(), {
    once: true,
  });

  return { destroy };
};
