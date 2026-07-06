import type Zoomist from "zoomist";
import type { BoundingRect } from "zoomist/types";

import { h } from "../h";
import { portalElement } from "../utils/portal";

import "zoomist/css";

import { transitionViewIfSupported } from "../utils/viewTransition";
import { Button } from "./button";

import style from "./ImagePreviewModal.module.css";

export const handleImagePreviewModal = (opts: {
  root: HTMLDivElement;
  signal: AbortSignal;
  selector: string;
}) => {
  opts.root.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement;
      const image = target.closest(opts.selector) as HTMLImageElement;
      if (!image) return;
      const url = image.src;
      createImagePreviewModal({ src: url, imageEl: image });
    },
    { signal: opts.signal },
  );
};

const createImagePreviewModal = (opts: {
  src: string;
  imageEl?: HTMLImageElement;
}) => {
  const toggleViewTransitionName = (state: boolean) => {
    if (!opts.imageEl) return;
    (opts.imageEl.style as any)["view-transition-name"] = state
      ? "embed-image"
      : "";
  };

  const abortController = new AbortController();
  const { signal } = abortController;
  const el = (
    <div class={style.bg}>
      <div class="zoomist-container">
        <div class="zoomist-wrapper">
          <div class="zoomist-image">
            <img class={style.image} draggable="false" src={opts.src} />
          </div>
        </div>
      </div>

      <div class={style.overlay}>
        <div class={style.header}>
          <Button data-action="close" alert icon="close" hoverBorder />
        </div>
        <div class={style.controls}>
          <Button data-action="open" icon="open_in_new" hoverBorder />
          <Button data-action="copy" icon="content_copy" hoverBorder />
        </div>
      </div>
    </div>
  ) as HTMLDivElement;

  abortController.signal.addEventListener(
    "abort",
    () => {
      transitionViewIfSupported(() => {
        toggleViewTransitionName(true);
        setTimeout(() => {
          toggleViewTransitionName(false);
        }, 100);
        portalElement().removeChild(el);
      });
    },
    { once: true },
  );

  let downX = 0;
  let downY = 0;
  let MOVE_THRESHOLD = 10;
  el.addEventListener("mousedown", (e) => {
    downX = e.clientX;
    downY = e.clientY;
  });

  el.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLDivElement;
      if (target.classList.contains("zoomist-image")) {
        const moveX = e.clientX - downX;
        const moveY = e.clientY - downY;

        if (
          Math.abs(moveX) > MOVE_THRESHOLD ||
          Math.abs(moveY) > MOVE_THRESHOLD
        ) {
          return;
        }

        abortController.abort();
      }

      const button = target.closest(`.button`) as HTMLElement;
      if (!button) return;
      const action = button.dataset.action;
      switch (action) {
        case "close": {
          abortController.abort();
          break;
        }
        case "open": {
          window.open(opts.src, "_blank");
          break;
        }
        case "copy": {
          copyClipboard(opts.src);
          break;
        }
      }
    },
    { signal },
  );

  toggleViewTransitionName(true);
  transitionViewIfSupported(() => {
    toggleViewTransitionName(false);
    portalElement().appendChild(el);
    setTimeout(() => {
      el.classList.add(style.showOverlay!);
      createZoomistInstance({
        zoomistImage: el.querySelector(`.zoomist-image`) as HTMLDivElement,
        img: el.querySelector(`.zoomist-container`) as HTMLImageElement,
        signal,
      });
    }, 200);
  });
};

const createZoomistInstance = async (opts: {
  zoomistImage: HTMLDivElement;
  img: HTMLElement;
  signal: AbortSignal;
}) => {
  const { img, signal } = opts;

  const { default: Zoomist } = await import("zoomist");

  if (signal.aborted) return null;

  let zoomist = new Zoomist(img, {
    bounds: true,
    smooth: true,
    zoomRatio: 0.5,
  });

  let lastClickTime = 0;
  let lastClickX = 0;
  let lastClickY = 0;
  const DOUBLE_CLICK_THRESHOLD = 300;
  const POSITION_THRESHOLD = 20;
  const TARGET_SCALE = 2.5;

  img.addEventListener(
    "click",
    (e) => {
      const currentTime = Date.now();
      const timeSinceLastClick = currentTime - lastClickTime;

      const deltaX = Math.abs(e.clientX - lastClickX);
      const deltaY = Math.abs(e.clientY - lastClickY);

      if (
        timeSinceLastClick < DOUBLE_CLICK_THRESHOLD &&
        deltaX < POSITION_THRESHOLD &&
        deltaY < POSITION_THRESHOLD
      ) {
        const currentScale = zoomist.getScaleRatio();

        let zoom = currentScale !== 0 ? 0 : TARGET_SCALE;

        zoomTo(opts.zoomistImage, zoomist, zoom, {
          clientX: e.clientX,
          clientY: e.clientY,
        });

        lastClickTime = 0;
      } else {
        lastClickTime = currentTime;
        lastClickX = e.clientX;
        lastClickY = e.clientY;
      }
    },
    { signal },
  );
  signal.addEventListener(
    "abort",
    () => {
      zoomist.destroy();
    },
    { once: true },
  );

  return zoomist;
};

const minmax = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const getBoundingRect = (target: HTMLElement): BoundingRect => {
  const { width, height, top, left, bottom } = target.getBoundingClientRect();
  return {
    width,
    height,
    top,
    left,
    bottom,
  };
};

type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

const setObject = <T, K extends keyof T>(obj: T, value: Pick<T, K>): void => {
  for (const [k, v] of Object.entries(value) as Entries<Pick<T, K>>) {
    obj[k] = v;
  }
};

function zoomTo(
  zoomistImage: HTMLDivElement,
  zoomist: Zoomist,
  ratio: number,
  pointer: { clientX: number; clientY: number },
) {
  const {
    image,
    transform: { scale, translateX: oldTranslateX, translateY: oldTranslateY },
    options: { bounds },
  } = zoomist;
  ratio = zoomist.useFixedRatio(ratio);
  if (ratio === scale) return zoomist;

  let oldScale = zoomist.transform.scale;
  zoomist.transform.scale = ratio;

  const { clientX, clientY } = pointer;
  const {
    top: imageTop,
    left: imageLeft,
    width: imageWidth,
    height: imageHeight,
  } = getBoundingRect(image);
  const { width: widthDiff, height: heightDiff } = zoomist.getImageDiff();
  const scaleDiff = ratio / scale - 1;
  const distanceX =
    (imageWidth / 2 - clientX + imageLeft) * scaleDiff + oldTranslateX;
  const distanceY =
    (imageHeight / 2 - clientY + imageTop) * scaleDiff + oldTranslateY;
  const translateX = bounds
    ? minmax(distanceX, widthDiff, -widthDiff)
    : distanceX;
  const translateY = bounds
    ? minmax(distanceY, heightDiff, -heightDiff)
    : distanceY;

  zoomist.transform.scale = oldScale;

  zoomistImage.style.transition = "0.2s";
  setTimeout(() => {
    zoomistImage.style.transition = "";
    zoomist.update();
    zoomist.transform.scale = ratio;

    setObject(zoomist.transform, {
      translateX,
      translateY,
    });
  }, 200);

  zoomist.transform.scale = ratio;
  setObject(zoomist.transform, {
    translateX,
    translateY,
  });

  zoomist.emit("zoom", zoomist, zoomist.transform.scale);

  return zoomist;
}

function copyClipboard(imgSrc: string) {
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = imgSrc;

  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext("2d")!.drawImage(img, 0, 0, img.width, img.height);
    canvas.toBlob((blob) => {
      navigator.clipboard.write([new ClipboardItem({ "image/png": blob! })]);
    }, "image/png");
  };
}
