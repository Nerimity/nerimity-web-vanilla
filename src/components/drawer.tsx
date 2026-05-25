import { css } from "@linaria/core";

import { h } from "../h";
import { scoped } from "../utils/css";
import { storeEmitter } from "../utils/EventEmitter";
import { userAgent } from "../utils/userAgent";

let drawer: ReturnType<typeof createDrawer> | null = null;

export const Drawer = () => (drawer ??= createDrawer());

const drawerContainer = css`
  display: flex;
  position: relative;
  flex: 1;
  overflow: hidden;
  .${scoped`content`} {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    flex: 1;

    .${scoped`contentInner`} {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex: 1;
    }
  }

  .${scoped`leftDrawer`}, .${scoped`rightDrawer`} {
    background-color: var(--drawer-bg);
    display: flex;
    overflow: hidden;
  }

  .${scoped`innerDrawer`} {
    display: flex;
    overflow: hidden;
    flex-shrink: 0;
  }

  &[data-mode="desktop"] .${scoped`leftDrawer`} {
    transition: width 0.2s;

    width: 300px;
    .${scoped`leftDrawerInner`} {
      width: 300px;
    }
    &.${scoped`hide`} {
      width: 0;
    }
  }
  &[data-mode="desktop"] .${scoped`rightDrawer`} {
    transition: width 0.2s;

    width: 260px;
    .${scoped`rightDrawerInner`} {
      width: 260px;
    }
    &.${scoped`hide`} {
      width: 0;
    }
  }

  &[data-mode="mobile"] .${scoped`innerDrawer`} {
    flex: 1;
  }

  &[data-mode="mobile"] .${scoped`leftDrawer`} {
    right: 50px;
    left: 0;
  }
  &[data-mode="mobile"] .${scoped`rightDrawer`} {
    left: 50px;
    right: 0;
  }

  &[data-mode="mobile"]
    .${scoped`leftDrawer`},
    &[data-mode="mobile"]
    .${scoped`rightDrawer`} {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 1;
  }
  &[data-mode="mobile"] .${scoped`content`} {
    position: relative;
    z-index: 111111111;
    background: var(--background);
  }
  .${scoped`overlay`} {
    pointer-events: none;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 111111111;
    background-color: var(--background);
    transition: 0.2s;
    opacity: 0;
    &.${scoped`visible`} {
      opacity: 0.8;
      pointer-events: all;
    }
  }
`;

const MOBILE_WIDTH = 800;
const PEEK_WIDTH = 50;

function createDrawer() {
  let currentPage = 1;
  let visiblePage = 1;

  let desktopHideLeftDrawer = false;
  let desktopHideRightDrawer = false;

  let rightDrawerAvailable = false;

  let currentMode: "mobile" | "desktop" =
    window.innerWidth < MOBILE_WIDTH ? "mobile" : "desktop";

  const leftDrawerInner = (
    <div class={`${scoped`leftDrawerInner`} ${scoped`innerDrawer`}`}></div>
  ) as HTMLElement;
  const leftDrawer = (
    <div class={scoped`leftDrawer`}>{leftDrawerInner}</div>
  ) as HTMLElement;

  const rightDrawerInner = (
    <div class={`${scoped`rightDrawerInner`} ${scoped`innerDrawer`}`}></div>
  ) as HTMLElement;
  const rightDrawer = (
    <div class={scoped`rightDrawer`}>{rightDrawerInner}</div>
  ) as unknown as HTMLElement;

  const contentInner = (
    <div class={scoped`contentInner`}></div>
  ) as HTMLElement;
  const overlay = (<div class={scoped`overlay`}></div>) as HTMLElement;

  const updateRightDrawerAvailable = (available: boolean) => {
    rightDrawerAvailable = available;
    storeEmitter.emit("drawer:rightDrawerAvailable", rightDrawerAvailable);
    if (currentPage === 2 && !available) {
      updatePage({ page: 1 });
    }

    if (available) {
      rightDrawer.style.display = "";
    } else if (!available) {
      rightDrawer.style.display = "none";
    }
  };

  const content = (
    <div class={scoped`content`}>
      {overlay}
      {contentInner}
    </div>
  ) as HTMLElement;

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
      updatePage({ animate: false });
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

    const isLeft = currentOffset > 0;
    const isRight = currentOffset + window.innerWidth < window.innerWidth;
    if (isRight && !rightDrawerAvailable) return;

    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      content.style.transform = `translate(${currentOffset}px, 0)`;

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

  const updatePage = (opts?: {
    animate?: boolean;
    page?: number;
    toggleLeftDesktop?: boolean;
    toggleRightDesktop?: boolean;
  }) => {
    if (opts?.page !== undefined) currentPage = opts.page;
    if (currentMode === "desktop") {
      currentPage = 1;
      leftDrawer.style.zIndex = "1";
      rightDrawer.style.zIndex = "1";
      if (opts?.toggleLeftDesktop)
        desktopHideLeftDrawer = !desktopHideLeftDrawer;
      if (opts?.toggleRightDesktop) {
        desktopHideRightDrawer = !desktopHideRightDrawer;
        storeEmitter.emit("drawer:toggleRightDesktop", desktopHideRightDrawer);
      }

      leftDrawer.classList.toggle(scoped`hide`, desktopHideLeftDrawer);
      rightDrawer.classList.toggle(scoped`hide`, desktopHideRightDrawer);
    }
    if (currentMode === "mobile") {
      leftDrawer.classList.remove(scoped`hide`);
      rightDrawer.classList.remove(scoped`hide`);
    }
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
    if (currentPage !== 1) overlay.classList.add(scoped`visible`);
    if (currentPage === 1) overlay.classList.remove(scoped`visible`);
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
        if (currentPage > 2) {
          currentPage = 2;
        }
      } else if (isSwipingLeft && beforePage >= 0) {
        currentPage = beforePage - 1;
        if (currentPage < 0) currentPage = 0;
      }
    }
    if (!rightDrawerAvailable && currentPage === 2) {
      currentPage = 1;
    }

    updatePage();
  };

  const { safari, firefox } = userAgent;

  let ignoreNextScroll = false;
  const setIgnoreNextScroll = () => {
    ignoreNextScroll = true;
  };

  const handleScroll = () => {
    if (ignoreNextScroll) {
      ignoreNextScroll = false;
      return;
    }
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
  overlay.addEventListener(
    "click",
    () => {
      updatePage({ page: 1 });
    },
    { signal: abortController.signal },
  );

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
    leftDrawer: leftDrawerInner,
    content: contentInner,
    rightDrawer: rightDrawerInner,
    updatePage,
    setIgnoreNextScroll,
    get currentPage() {
      return currentPage;
    },
    get currentMode() {
      return currentMode;
    },
    get visiblePage() {
      return visiblePage;
    },
    get desktopHideRightDrawer() {
      return desktopHideRightDrawer;
    },
    get rightDrawerAvailable() {
      return rightDrawerAvailable;
    },
    updateRightDrawerAvailable,
  };
}
