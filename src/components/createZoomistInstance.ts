import Zoomist from "zoomist";

import "zoomist/css";

export const createZoomistInstance = (opts: {
  img: HTMLElement;
  signal: AbortSignal;
}) => {
  const { img, signal } = opts;

  if (signal.aborted) return null;

  const zoomist = new Zoomist(img, {
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
    "pointerup",
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
        const zoom = currentScale !== 0 ? 0 : TARGET_SCALE;

        zoomist.zoomTo(zoom, {
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
