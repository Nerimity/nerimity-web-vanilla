import { css } from "@linaria/core";

import { h } from "../h";

let drawer: ReturnType<typeof createDrawer> | null = null;

export const Drawer = () => (drawer ??= createDrawer());

const drawerContainer = css`
  display: flex;
  position: relative;
  flex: 1;
  overflow: hidden;
  > .content {
    display: flex;
    overflow: hidden;
    flex: 1;
  }

  > .leftDrawer,
  > .rightDrawer {
    background-color: var(--drawer-bg);

    display: flex;
  }

  &[data-mode="desktop"] > .leftDrawer {
    width: 300px;
  }
  &[data-mode="desktop"] > .rightDrawer {
    width: 260px;
  }
  &[data-mode="mobile"] > .leftDrawer,
  &[data-mode="mobile"] > .rightDrawer {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 1;
  }
  &[data-mode="mobile"] > .content {
    position: relative;
    z-index: 111111111;
    background: var(--background);
  }
`;

const MOBILE_WIDTH = 800;

function createDrawer() {
  let currentPage = 1;
  let currentMode = window.innerWidth < MOBILE_WIDTH ? "mobile" : "desktop";
  const leftDrawer = (<div class="leftDrawer"></div>) as unknown as HTMLElement;
  const content = (<div class="content"></div>) as unknown as HTMLElement;
  const rightDrawer = (
    <div class="rightDrawer"></div>
  ) as unknown as HTMLElement;
  const drawerEl = (
    <div class={drawerContainer} data-mode={currentMode}>
      {leftDrawer}
      {content}
      {rightDrawer}
    </div>
  ) as unknown as HTMLElement;
  const abortController = new AbortController();

  window.addEventListener(
    "resize",
    () => {
      const newMode = window.innerWidth < MOBILE_WIDTH ? "mobile" : "desktop";
      if (newMode !== currentMode) {
        currentMode = newMode;
        onModeChange();
      }
    },
    { signal: abortController.signal },
  );

  let startX = 0;
  let currentX = 0;
  let currentOffset = 0;
  let offsetAtDragStart = 0;
  let rafPending = false;
  let pauseTouches = false;
  let startTime = 0;

  const handleTouchMove = (event: TouchEvent) => {
    if (pauseTouches) return;
    const touch = event.touches[0];
    if (!touch) return;
    currentX = touch.clientX;
    currentOffset = offsetAtDragStart + (touch.clientX - startX);

    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      content.style.transform = `translate(${currentOffset}px, 0)`;
      rafPending = false;
    });
  };

  const updatePage = () => {
    leftDrawer.style.zIndex = "-1";
    rightDrawer.style.zIndex = "-1";
    const contentWidth = content.clientWidth;
    console.log("update page");

    if (currentPage === 0) {
      leftDrawer.style.zIndex = "1";
      content.style.transform = `translate(${contentWidth + 50}px, 0)`;
    }

    if (currentPage === 2) {
      rightDrawer.style.zIndex = "1";
      content.style.transform = `translate(-${contentWidth + 50}px, 0)`;
    }

    if (currentPage === 1) {
      content.style.transform = `translate(0, 0)`;
    }
  };

  const handleTouchUp = () => {
    const distance = startX - currentX;
    const time = Date.now() - startTime;
    const velocity = Math.abs(distance / time);
    if (time <= 150 && velocity >= 0.5) {
      const isSwipingLeft = distance <= 0;
      const isSwipingRight = distance >= 1;
      if (isSwipingRight && currentPage <= 2) {
        currentPage = currentPage + 1;
      } else if (isSwipingLeft && currentPage >= 0) {
        currentPage = currentPage - 1;
      }
    }
    updatePage();
  };

  const handleScroll = () => {
    pauseTouches = true;
  };

  const handleTouchStart = (event: TouchEvent) => {
    pauseTouches = false;
    const touch = event.touches[0];
    if (!touch) return;
    startX = touch.clientX;
    offsetAtDragStart = currentOffset;
    startTime = Date.now();
  };

  window.addEventListener("touchstart", handleTouchStart, {
    signal: abortController.signal,
    passive: true,
    capture: false,
  });
  window.addEventListener("touchmove", handleTouchMove, {
    signal: abortController.signal,
    passive: false,
    capture: false,
  });
  window.addEventListener("touchend", handleTouchUp, {
    signal: abortController.signal,
    passive: true,
    capture: false,
  });
  window.addEventListener("touchcancel", handleTouchUp, {
    signal: abortController.signal,
    passive: true,
  });

  window.addEventListener("scroll", handleScroll, {
    capture: true,
    signal: abortController.signal,
  });

  const onModeChange = () => {
    console.log(currentMode);
    drawerEl.dataset.mode = currentMode;
  };

  const render = () => {
    return drawerEl;
  };

  const destroy = () => {
    leftDrawer.remove();
    content.remove();
    rightDrawer.remove();
    drawerEl.remove();
    abortController.abort();
    drawer = null;
  };

  return { render, destroy, leftDrawer, content, rightDrawer };
}
