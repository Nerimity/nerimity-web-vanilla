import { cdnUrl } from "../../config";
import { closestFromEvent } from "../../utils/dom";
import { portalElement } from "../../utils/portal";
import { transitionViewIfSupported } from "../../utils/viewTransition";
import { createLinkWarnModal } from "../modals/LinkWarnModal";
import { Button } from "./button";

import style from "./ImagePreviewModal.module.css";

export const handleImagePreviewModal = (opts: {
  root: HTMLDivElement;
  signal: AbortSignal;
  selector: string;
  hideActions?: boolean;
}) => {
  opts.root.addEventListener(
    "click",
    (e) => {
      const image = closestFromEvent<HTMLImageElement>(e, opts.selector);
      if (!image) return;
      const url = image.src;
      createImagePreviewModal({
        src: url,
        imageEl: image,
        hideActions: opts.hideActions,
      });
    },
    { signal: opts.signal },
  );
};

const createImagePreviewModal = (opts: {
  src: string;
  imageEl?: HTMLImageElement;
  hideActions?: boolean;
}) => {
  const toggleViewTransitionName = (state: boolean) => {
    if (!opts.imageEl) return;
    (opts.imageEl.style as any)["view-transition-name"] = state
      ? "embed-image"
      : "";
  };

  const origSrc = opts.imageEl?.dataset.origSrc;

  const abortController = new AbortController();
  const { signal } = abortController;

  const url = new URL(opts.src);
  if (url.href.startsWith(cdnUrl)) {
    url.search = "";
  }

  const el = (
    <div class={style.bg}>
      <div class="zoomist-container">
        <div class="zoomist-wrapper">
          <div class="zoomist-image">
            <img class={style.image} draggable="false" src={url.href} />
          </div>
        </div>
      </div>

      <div class={style.overlay}>
        <div class={style.header}>
          <Button data-action="close" alert icon="close" hoverBorder />
        </div>
        {!opts.hideActions && (
          <div class={style.controls}>
            <Button data-action="open" icon="open_in_new" hoverBorder />
            <Button data-action="copy" icon="content_copy" hoverBorder />
          </div>
        )}
      </div>
    </div>
  ) as HTMLDivElement;

  el.addEventListener(
    "contextmenu",
    (e) => {
      e.preventDefault();
    },
    { signal },
  );

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
  el.addEventListener(
    "pointerdown",
    (e) => {
      downX = e.clientX;
      downY = e.clientY;
    },
    { signal },
  );

  el.addEventListener(
    "pointerup",
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

      const button = closestFromEvent(e, `.button`);
      if (!button) return;
      const action = button.dataset.action;
      switch (action) {
        case "close": {
          abortController.abort();
          break;
        }
        case "open": {
          if (origSrc) {
            createLinkWarnModal(origSrc);
            return;
          }
          window.open(opts.src, "_blank");
          break;
        }
        case "copy": {
          copyClipboard(origSrc || opts.src);
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
      import("../createZoomistInstance").then(({ createZoomistInstance }) => {
        createZoomistInstance({
          img: el.querySelector(`.zoomist-container`) as HTMLImageElement,
          signal,
        });
      });
    }, 200);
  });
};

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
