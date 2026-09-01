// TODO:
// This library kinda sucks and memory leaks. Maybe make your own color picker, it doesn't seem hard.

import "@melloware/coloris/dist/coloris.css";
import Coloris from "@melloware/coloris";

import { debounce } from "../utils/debounce";
import { createModal, Modal } from "./modal";

import style from "./createColorPickerModal.module.css";
export interface ColorPickerModalOpts {
  color: string;
  triggerEl: HTMLElement;
  onChange: (color: string) => void;
}

Coloris.init();

export const createColorPickerModal = (opts: ColorPickerModalOpts) => {
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

  createModal(
    () => (
      <Modal.Root
        fullHeight
        backdropClass={style.modalBackdrop}
        pos={{
          x: rect.x + "px",
          y: rect.y + rect.height + "px",
        }}
      >
        <Modal.Body class={style.modalBody}>{container}</Modal.Body>
      </Modal.Root>
    ),
    ac,
  );
  let currentColor = opts.color;
  const debounceOnChange = debounce(() => {
    opts.onChange(currentColor);
  }, 100);
  Coloris({
    el: input,
    parent: colorisEl,
    themeMode: "dark",
    inline: true,
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
      opts.onChange(currentColor);
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
