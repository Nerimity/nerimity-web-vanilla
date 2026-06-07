import { css } from "@linaria/core";

import { mobileWidth } from "../config";
import { h } from "../h";
import { scoped } from "../utils/css";
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
  return <div class={modalRoot}>{props.children}</div>;
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
  const modal = children() as HTMLElement;
  const backdrop = (<div class={modalBackdrop}>{modal}</div>) as HTMLDivElement;
  const { signal } = abortController;

  let Y = 0;
  let startY = 0;
  let baseY = 0;

  let lastTouchY = 0;
  let lastTouchTime = 0;
  let velocityY = 0;

  window.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      startY = touch.clientY;
      baseY = Y;

      lastTouchY = touch.clientY;
      lastTouchTime = performance.now();
      velocityY = 0;
    },
    { signal, passive: true },
  );

  window.addEventListener(
    "touchmove",
    (event) => {
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

      Y = targetY;
      modal.style.transform = `translateY(${Y}px)`;
    },
    { signal, passive: true },
  );

  window.addEventListener(
    "touchend",
    () => {
      const modalHeight = modal.offsetHeight;
      const currentInitialY = initialY();

      const velocityThreshold = 0.5;
      const distanceThreshold = modalHeight * 0.6;
      const draggedDistance = Y - currentInitialY;

      if (
        velocityY > velocityThreshold ||
        draggedDistance > distanceThreshold
      ) {
        destroy();
      } else if (draggedDistance > 0) {
        Y = currentInitialY;
        const anim = modal.animate(
          { transform: `translateY(${Y}px)` },
          {
            duration: 200,
            fill: "forwards",
            easing: "cubic-bezier(0.05, 0.7, 0.1, 1.0)",
          },
        );
        anim.onfinish = () => {
          anim.commitStyles();
          anim.cancel();
        };
      }
    },
    { signal, passive: true },
  );

  const initialY = () => {
    const targetVisibility = 50;

    const modalHeight = modal.offsetHeight;
    const windowHeight = window.innerHeight;
    const percentTakingScreen = (modalHeight / windowHeight) * 100;

    if (percentTakingScreen < targetVisibility) {
      return windowHeight - modalHeight;
    } else {
      return windowHeight / 2;
    }
  };

  const initialPosition = () => {
    const windowHeight = window.innerHeight;
    Y = windowHeight;
    modal.style.transform = `translateY(${Y}px)`;

    Y = initialY();

    const anim = modal.animate(
      { transform: `translateY(${Y}px)` },
      {
        duration: 200,
        fill: "forwards",
        easing: "cubic-bezier(0.05, 0.7, 0.1, 1.0)",
      },
    );
    anim.onfinish = () => {
      anim.commitStyles();
      anim.cancel();
    };
  };
  requestAnimationFrame(initialPosition);

  let wheelTimeout: number | null = null;
  let lastWheelTime = 0;
  let wheelVelocityY = 0;

  const handleScroll = (event: WheelEvent) => {
    const currentTime = performance.now();
    const timeDelta = currentTime - lastWheelTime;

    if (timeDelta > 0) {
      wheelVelocityY = event.deltaY / timeDelta;
    }
    lastWheelTime = currentTime;

    Y = Y - event.deltaY;

    const modalHeight = modal.offsetHeight;
    const windowHeight = window.innerHeight;
    const minY = windowHeight - modalHeight;

    if (Y < minY) Y = minY;
    if (Y > windowHeight) Y = windowHeight;

    modal.style.transform = `translateY(${Y}px)`;

    if (wheelTimeout) {
      clearTimeout(wheelTimeout);
    }

    wheelTimeout = window.setTimeout(() => {
      const currentInitialY = initialY();
      const velocityThreshold = 0.5;
      const distanceThreshold = modalHeight * 0.6;
      const draggedDistance = Y - currentInitialY;

      if (
        wheelVelocityY > velocityThreshold ||
        draggedDistance > distanceThreshold
      ) {
        destroy();
      } else if (draggedDistance > 0) {
        Y = currentInitialY;
        const anim = modal.animate(
          { transform: `translateY(${Y}px)` },
          {
            duration: 200,
            fill: "forwards",
            easing: "cubic-bezier(0.05, 0.7, 0.1, 1.0)",
          },
        );
        anim.onfinish = () => {
          anim.commitStyles();
          anim.cancel();
        };
      }
      wheelVelocityY = 0;
    }, 150);
  };

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

  portalElement().appendChild(backdrop);

  const destroy = () => {
    backdrop.animate(
      { background: "rgba(0, 0, 0, 0)" },
      {
        duration: 200,
        fill: "forwards",
      },
    );
    modal.animate(
      { transform: `translateY(${window.innerHeight}px)` },
      {
        duration: 200,
        easing: "cubic-bezier(0.3, 0.0, 0.8, 0.15)",
        fill: "forwards",
      },
    ).onfinish = () => {
      abortController.abort();
      backdrop.remove();
    };
  };
  abortController.signal.addEventListener("abort", () => destroy(), {
    once: true,
  });

  return { destroy };
};
