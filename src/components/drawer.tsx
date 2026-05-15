import { css } from "@linaria/core";

import { h } from "../h";
import { userAgent } from "../utils/userAgent";
import { storeEmitter } from "../utils/EventEmitter";

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

  &[data-mode="mobile"] > .leftDrawer {
    right: 50px;
    left: 0;
  }
  &[data-mode="mobile"] > .rightDrawer {
    left: 50px;
    right: 0;
  }

  &[data-mode="mobile"] > .leftDrawer,
  &[data-mode="mobile"] > .rightDrawer {
    position: absolute;
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
const PEEK_WIDTH = 50;

function createDrawer() {
  let currentPage = 1;
  let visiblePage = 1;
  let currentMode: "mobile" | "desktop" =
    window.innerWidth < MOBILE_WIDTH ? "mobile" : "desktop";
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
      updatePage();
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

    if (window.innerWidth - currentOffset <= PEEK_WIDTH) return;
    if (currentOffset + window.innerWidth <= PEEK_WIDTH) return;

    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      content.style.transform = `translate(${currentOffset}px, 0)`;

      const isLeft = currentOffset > 0;
      const isRight = currentOffset + window.innerWidth < window.innerWidth;

      if (isLeft) {
        leftDrawer.style.zIndex = "1";
        rightDrawer.style.zIndex = "-1";
        updateVisible(0);
      }

      if (isRight) {
        rightDrawer.style.zIndex = "1";
        leftDrawer.style.zIndex = "-1";
        updateVisible(2);
      }

      rafPending = false;
    });
  };

  let animationTimeout: NodeJS.Timeout | null = null;

  const updatePage = (opts?: { animate?: boolean; page?: number }) => {
    if (currentMode === "desktop") {
      currentPage = 1;
      leftDrawer.style.zIndex = "1";
      rightDrawer.style.zIndex = "1";
    }
    if (opts?.page !== undefined) currentPage = opts.page;
    const contentWidth = content.clientWidth;

    if (animationTimeout) clearTimeout(animationTimeout);
    if (opts?.animate != false) {
      content.style.transition = "transform 0.2s";
      animationTimeout = setTimeout(() => {
        content.style.transition = "";
      }, 200);
    }

    if (currentPage === 0) {
      leftDrawer.style.zIndex = "1";
      rightDrawer.style.zIndex = "-1";
      currentOffset = contentWidth - PEEK_WIDTH;
    }

    if (currentPage === 2) {
      rightDrawer.style.zIndex = "1";
      leftDrawer.style.zIndex = "-1";
      currentOffset = -(contentWidth - PEEK_WIDTH);
    }

    if (currentPage === 1) {
      currentOffset = 0;
    }
    offsetAtDragStart = currentOffset;
    content.style.transform = `translate(${currentOffset}px, 0)`;
    updateVisible(currentPage);
  };

  const handleTouchUp = () => {
    const isLeft = currentOffset > window.innerWidth / 2;
    const isRight = currentOffset + window.innerWidth < window.innerWidth / 2;
    const isContent = !isLeft && !isRight;

    const beforePage = currentPage;

    if (isLeft) currentPage = 0;
    if (isContent) currentPage = 1;
    if (isRight) currentPage = 2;

    const distance = startX - currentX;
    const time = Date.now() - startTime;
    const velocity = Math.abs(distance / time);

    if (time <= 150 && velocity >= 0.5) {
      const isSwipingLeft = distance <= 0;
      const isSwipingRight = distance >= 1;

      if (isSwipingRight && beforePage <= 2) {
        currentPage = beforePage + 1;
        if (currentPage > 2) currentPage = 2;
      } else if (isSwipingLeft && beforePage >= 0) {
        currentPage = beforePage - 1;
        if (currentPage < 0) currentPage = 0;
      }
    }

    updatePage();
  };

  const { safari, firefox } = userAgent;

  const handleScroll = () => {
    if (safari || firefox) return;

    pauseTouches = true;
    updatePage({ animate: false });
  };

  const handleTouchStart = (event: TouchEvent) => {
    pauseTouches = currentMode === "desktop" ? true : false;
    const touch = event.touches[0];
    if (!touch) return;
    content.style.transition = "";
    startX = touch.clientX;
    currentX = startX;
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
    drawerEl.dataset.mode = currentMode;
    storeEmitter.emit("drawer:modeChange", currentMode);
  };

  const render = () => {
    return drawerEl;
  };
  const updateVisible = (page: number) => {
    const oldVis = visiblePage;
    visiblePage = page;
    if (oldVis !== visiblePage) {
      storeEmitter.emit("drawer:pageVisible", visiblePage);
    }
  };

  const destroy = () => {
    if (animationTimeout) {
      clearTimeout(animationTimeout);
    }
    leftDrawer.remove();
    content.remove();
    rightDrawer.remove();
    drawerEl.remove();
    abortController.abort();
    drawer = null;
  };

  return {
    render,
    destroy,
    leftDrawer,
    content,
    rightDrawer,
    updatePage,
    get currentPage() {
      return currentPage;
    },
    get currentMode() {
      return currentMode;
    },
    get visiblePage() {
      return visiblePage;
    },
  };
}
