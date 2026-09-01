import { createColorPickerModalLazy } from "./createColorPickerLazy";
import { Icon } from "./icon";

import style from "./ColorPicker.module.css";

interface ColorPickerProps {
  initialColor: () => string | undefined;
  signal: AbortSignal;
  onChange: (color: string) => void;
}

const ColorPicker = (props: ColorPickerProps) => {
  return (
    <div class={style.colorPicker}>
      <div class={style.container}>
        <Icon class={style.icon} name="brush" />
        <div
          class={style.colorLine}
          style={{ background: props.initialColor() }}
        ></div>
      </div>
    </div>
  );
};

export const createColorPicker = (props: ColorPickerProps) => {
  let colorPickerEl = (<ColorPicker {...props} />) as HTMLDivElement;

  let line = colorPickerEl.querySelector(
    `.${style.colorLine}`,
  ) as HTMLDivElement;

  const update = () => {
    line.style.background = props.initialColor()!;
  };

  colorPickerEl.addEventListener(
    "click",
    () => {
      createColorPickerModalLazy({
        color: props.initialColor() || "black",
        triggerEl: colorPickerEl,
        onChange: (color) => {
          props.onChange(color);
          update();
        },
      });
    },
    { signal: props.signal },
  );

  props.signal.addEventListener(
    "abort",
    () => {
      colorPickerEl.remove();
      line.remove();
      (line as any) = null;
      (colorPickerEl as any) = null;
    },
    { once: true },
  );

  return {
    get el() {
      return colorPickerEl;
    },
    update,
  };
};
