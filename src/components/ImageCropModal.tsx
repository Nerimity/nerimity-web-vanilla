import { t } from "@lingui/core/macro";
import { Cropt, type CroptState } from "cropt";

import { Button } from "./button";
import { createModal, Modal } from "./modal";

import "cropt/src/cropt.css";

function getCropRect(state: CroptState) {
  const { x, y, width, height, zoom } = state;
  return {
    startX: Math.round(x),
    startY: Math.round(y),
    endX: Math.round(x + width / zoom),
    endY: Math.round(y + height / zoom),
  };
}

export const createImageCropModal = (props: {
  src: string;
  type: "avatar" | "banner";
}) => {
  const abortController = new AbortController();
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

  const body = (
    <Modal.Body width="400px">{croptEl}</Modal.Body>
  ) as HTMLDivElement;

  const modal = (
    <Modal.Root>
      <Modal.Header label={t`Crop Image`} icon="image" />
      {body}
      <Modal.Footer>
        <Button
          class="button"
          data-action="close"
          label={t`Don't Crop`}
          hoverBorder
        />
        <Button data-action="kick" class="button" label={t`Crop`} primary />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  modal.addEventListener(
    "click",
    async () => {
      // const target = e.target as HTMLElement;
      // const button = target.closest(".button") as HTMLElement | null;
      // const action = button?.dataset.action;
      console.log(getCropRect(cropt.getState()));
    },
    { signal },
  );

  signal.addEventListener(
    "abort",
    () => {
      cropt.destroy();
    },
    { once: true },
  );

  createModal(() => {
    return modal;
  }, abortController);
};
