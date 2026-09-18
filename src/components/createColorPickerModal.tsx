// TODO:
// This library kinda sucks and memory leaks. Maybe make your own color picker, it doesn't seem hard.

import "@melloware/coloris/dist/coloris.css";
import Coloris from "@melloware/coloris";

import { debounce } from "../utils/debounce";
import { createModal, Modal } from "./modal";

import style from "./createColorPickerModal.module.css";

export type ColorPickerModalAnchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface ColorPickerModalOpts {
  color: string;
  triggerEl: HTMLElement;
  anchor?: ColorPickerModalAnchor;
  onChange?: (color: string) => void;
  onClose?: (color: string) => void;
  alpha?: boolean;
}

Coloris.init();

export const _createColorPickerModal = (opts: ColorPickerModalOpts) => {
  const ac = new AbortController();

  let input = (
    <input name="coloris" class={style.input} type="text" />
  ) as HTMLInputElement;
  let colorisEl = (
    <div class={style.colorisContainer}></div>
  ) as HTMLDivElement;

  let container = (
    <div>
      {colorisEl}
      {input}
    </div>
  ) as HTMLDivElement;

  const rect = opts.triggerEl.getBoundingClientRect();

  const getPosFromAnchor = () => {
    const defaultPos = {
      x: rect.left + "px",
      y: rect.bottom + "px",
    };

    if (!opts.anchor) return defaultPos;

    const anchorMap: Record<
      ColorPickerModalAnchor,
      { x: string; y: string; anchor: ColorPickerModalAnchor }
    > = {
      "top-left": {
        x: rect.left + "px",
        y: rect.top + "px",
        anchor: "bottom-left",
      },
      "top-center": {
        x: rect.left + rect.width / 2 + "px",
        y: rect.top + "px",
        anchor: "bottom-center",
      },
      "top-right": {
        x: rect.right + "px",
        y: rect.top + "px",
        anchor: "bottom-right",
      },
      "center-left": {
        x: rect.left + "px",
        y: rect.top + rect.height / 2 + "px",
        anchor: "center-right",
      },
      center: {
        x: rect.left + rect.width / 2 + "px",
        y: rect.top + rect.height / 2 + "px",
        anchor: "center",
      },
      "center-right": {
        x: rect.right + "px",
        y: rect.top + rect.height / 2 + "px",
        anchor: "center-left",
      },
      "bottom-left": {
        x: rect.left + "px",
        y: rect.bottom + "px",
        anchor: "top-left",
      },
      "bottom-center": {
        x: rect.left + rect.width / 2 + "px",
        y: rect.bottom + "px",
        anchor: "top-center",
      },
      "bottom-right": {
        x: rect.right + "px",
        y: rect.bottom + "px",
        anchor: "top-right",
      },
    };

    return anchorMap[opts.anchor];
  };

  const pos = getPosFromAnchor();

  createModal(
    () => (
      <Modal.Root fullHeight backdropClass={style.modalBackdrop} pos={pos}>
        <Modal.Body class={style.modalBody}>{container}</Modal.Body>
      </Modal.Root>
    ),
    ac,
  );
  let currentColor = opts.color;
  const debounceOnChange = debounce(() => {
    opts.onChange?.(currentColor);
  }, 100);
  Coloris({
    el: input,
    parent: colorisEl,
    themeMode: "dark",
    inline: true,
    alpha: opts.alpha,
    onChange: (color) => {
      currentColor = color;
      debounceOnChange();
    },
    defaultColor: opts.color,
  });
  const updatePosInterval = setInterval(() => {
    Coloris.updatePosition();
  }, 500);

  ac.signal.addEventListener(
    "abort",
    () => {
      Coloris.close();
      opts.onChange?.(currentColor);
      opts.onClose?.(currentColor);
      clearInterval(updatePosInterval);
      input.remove();
      colorisEl.remove();
      container.remove();

      (input as any) = null;
      (colorisEl as any) = null;
      (container as any) = null;
    },
    { once: true },
  );
};
