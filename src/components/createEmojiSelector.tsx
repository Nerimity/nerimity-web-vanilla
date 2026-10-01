import { CdnIcon } from "./cdnIcon";
import { ExpressionPickerLazy } from "./ExpressionPickerLazy";
import { Icon } from "./icon";

import style from "./createEmojiSelector.module.css";

interface EmojiSelectorProps {
  initialEmoji: () => string | undefined;
  signal: AbortSignal;
  onChange: (emoji: string) => void;
}

const EmojiPicker = () => {
  return (
    <div class={style.colorPicker}>
      <div class={style.container}></div>
    </div>
  );
};

export const createEmojiSelector = (props: EmojiSelectorProps) => {
  let colorPickerEl = (<EmojiPicker {...props} />) as HTMLDivElement;

  let containerEl = colorPickerEl.querySelector(
    `.${style.container}`,
  ) as HTMLDivElement;

  const update = () => {
    const initial = props.initialEmoji();
    containerEl.replaceChildren(
      initial ? (
        <CdnIcon
          class={style.icon}
          animate
          size={28}
          role={{ icon: initial }}
        />
      ) : (
        <Icon name="face" />
      ),
    );
  };
  update();

  colorPickerEl.addEventListener(
    "click",
    () => {
      ExpressionPickerLazy({
        targetEl: colorPickerEl,

        onEmojiPick(emoji, custom) {
          if (!custom) {
            props.onChange(emoji?.emoji!);
          }
          if (custom) {
            const isGif = custom.gif && !custom.webp;
            const animatedWebp = custom.gif && custom.webp;
            props.onChange(
              `${custom.id}.${isGif ? "gif" : "webp"}${animatedWebp ? "#a" : ""}`,
            );
          }
          update();
        },
        // onChange: (icon) => {
        //   props.onChange(icon);
        //   update();
        // },
      });
    },
    { signal: props.signal },
  );

  props.signal.addEventListener(
    "abort",
    () => {
      colorPickerEl.remove();
      containerEl.remove();
      (containerEl as any) = null;
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
