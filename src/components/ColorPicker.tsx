import { Icon } from "./icon";

import style from "./ColorPicker.module.css";

interface ColorPickerProps {
  initialColor: string;
}

export const ColorPicker = (props: ColorPickerProps) => {
  return (
    <div class={style.colorPicker}>
      <div class={style.container}>
        <Icon class={style.icon} name="brush" />
        <div
          class={style.colorLine}
          style={{ background: props.initialColor }}
        ></div>
      </div>
    </div>
  );
};
