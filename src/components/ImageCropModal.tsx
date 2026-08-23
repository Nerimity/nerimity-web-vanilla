import { t } from "@lingui/core/macro";
import { Cropt, type CroptState } from "cropt";

import { Button } from "./button";

import "cropt/src/cropt.css";
import { createModal, Modal } from "./modal";

export type CropPoints = [number, number, number, number];

function getCropRect(state: CroptState) {
  const { x, y, width, height, zoom } = state;
  const startX = Math.round(x);
  const startY = Math.round(y);
  const endX = Math.round(x + width / zoom);
  const endY = Math.round(y + height / zoom);
  return [startX, startY, endX, endY] as CropPoints;
}

let abortController = new AbortController();

export interface ImageCropModalProps {
  src: string;
  type: "avatar" | "banner";
  onCrop?: (points: CropPoints) => void;
  onDiscard?: () => void;
}
export const createImageCropModal = (props: ImageCropModalProps) => {
  abortController.abort();
  abortController = new AbortController();
  const { signal } = abortController;

  const isAvatar = props.type === "avatar";
  const viewportWidth = 250;
  const viewportHeight = isAvatar ? 250 : Math.round((viewportWidth * 12) / 30);

  let croptEl = (<div id="cropper"></div>) as HTMLDivElement;
  let cropt = new Cropt(croptEl, {
    viewport: {
      width: viewportWidth,
      height: viewportHeight,
      borderRadius: isAvatar ? "50%" : undefined,
    },
  });
  cropt.bind(props.src);

  const img = croptEl.querySelector("img") as HTMLImageElement;

  const emitCropChange = () => {
    props.onCrop?.(getCropRect(cropt.getState()));
  };

  const updateSlider = () => {
    const slider = croptEl.querySelector('[type="range"]') as HTMLInputElement;

    slider.max = (parseFloat(slider.max) * 2).toString();
    emitCropChange();
  };
  updateSlider();
  img.addEventListener("load", updateSlider, { signal });

  const body = (
    <Modal.Body width="400px">{croptEl}</Modal.Body>
  ) as HTMLDivElement;

  const modal = (
    <Modal.Root ignoreBgClick disableGestures fullHeight>
      <Modal.Header label={t`Crop Image`} icon="image" />
      {body}
      <Modal.Footer>
        <Button
          class="button"
          data-action="close"
          label={t`Don't Crop`}
          hoverBorder
        />
        <Button data-action="crop" class="button" label={t`Crop`} primary />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  const interval = setInterval(emitCropChange, 1000);

  let cropClicked = false;
  modal.addEventListener(
    "click",
    async (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest(".button") as HTMLElement | null;
      const action = button?.dataset.action as "close" | "crop";

      if (action === "close") {
        return abortController.abort();
      }
      if (action === "crop") {
        emitCropChange();
        cropClicked = true;

        return abortController.abort();
      }
    },
    { signal },
  );

  signal.addEventListener(
    "abort",
    () => {
      if (!cropClicked) {
        props.onDiscard?.();
      }
      clearInterval(interval);
      cropt.destroy();
    },
    { once: true },
  );

  createModal(() => {
    return modal;
  }, abortController);
};
