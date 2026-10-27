import { Dynamic } from "../../dynamic";
import type { KlipyItem } from "../../services/klipyService";
import { closestFromEvent } from "../../utils/dom";
import type { CustomEmoji, EmojiData } from "../../utils/emojis";
import { createResizeObserver } from "../../utils/observer";
import { createTimeModal } from "../modals/TimeModal";
import { Button } from "./button";
import { createColorPickerModalLazy } from "./createColorPickerLazy";
import { ExpressionPickerLazy } from "./expression-picker/ExpressionPickerLazy";

import style from "./input.module.css";

interface InputProps {
  class?: string | string[];
  prefix?: any;
  suffix?: any;
  label?: any;
  type?: "text" | "number" | "password" | "textarea";
  autocomplete?:
    | "current-password"
    | "one-time-code"
    | "new-password"
    | "email"
    | "off";
  placeholder?: string;
  id?: string;
  value?: string;
  maxLength?: number;
  showFormatBar?: boolean;
  showFormatBarHtml?: boolean;
  showFormatBarEmoji?: boolean;
  showFormatBarGif?: boolean;
  footer?: any;
  [key: string]: any;
}
export const Input = (props: InputProps) => {
  const {
    prefix,
    suffix,
    label,
    type,
    autocomplete,
    placeholder,
    id,
    value,
    maxLength,
    showFormatBar,
    showFormatBarHtml,
    showFormatBarEmoji,
    showFormatBarGif,
    footer,
    ...rest
  } = props;
  return (
    <div {...rest} class={[style.inputContainer, rest.class]}>
      {label && <div class="label">{label}</div>}
      {showFormatBar && (
        <FormatBar
          showFormatBarEmoji={showFormatBarEmoji}
          showFormatBarHtml={showFormatBarHtml}
          showFormatBarGif={showFormatBarGif}
        />
      )}

      <div class={[style.inputInnerContainer, "inputContainer"]}>
        <div class={style.inputInnerInnerContainer}>
          {prefix}
          <Dynamic
            id={id}
            placeholder={placeholder}
            maxlength={maxLength}
            class={["input", style.input]}
            component={type === "textarea" ? "textarea" : "input"}
            type={type || "text"}
            value={type != "textarea" ? value : undefined}
            autocomplete={autocomplete}
          >
            {type === "textarea" ? value || "" : ""}
          </Dynamic>
          {suffix}
        </div>
        {footer}
      </div>
    </div>
  );
};

export const createTextareaHeightHandler = (opts: {
  textarea: HTMLTextAreaElement;
  signal: AbortSignal;
}) => {
  const adjust = () => {
    opts.textarea.style.height = "34px";
    opts.textarea.style.height = opts.textarea.scrollHeight + "px";
  };

  requestAnimationFrame(adjust);

  createResizeObserver(opts.textarea, adjust, { signal: opts.signal });
  opts.textarea.addEventListener("input", adjust, { signal: opts.signal });
  return { adjust };
};

export const TimestampType = {
  RELATIVE: "tr",
  OFFSET: "to",
} as const;

const Formats = {
  named_link: (url: string) => ({
    offsetStart: 1,
    offsetEnd: "Name".length + 1,
    res: `[Name](${url || "https://example.com"})`,
  }),
  checkbox: (_text: string) => ({
    offsetStart: 5,
    offsetEnd: 5 + " Item 1".length,
    res: "-[ ] Item 1\n",
  }),
  header: (text: string) => ({
    offsetStart: 2,
    offsetEnd: text.length + 2,
    res: `# ${text}`,
  }),
  bold: (text: string) => ({
    offsetStart: 2,
    offsetEnd: text.length + 2,
    res: `**${text}**`,
  }),
  italic: (text: string) => ({
    offsetStart: 1,
    offsetEnd: text.length + 1,
    res: `_${text}_`,
  }),
  strikethrough: (text: string) => ({
    offsetStart: 2,
    offsetEnd: text.length + 2,
    res: `~~${text}~~`,
  }),
  spoiler: (text: string) => ({
    offsetStart: 2,
    offsetEnd: text.length + 2,
    res: `||${text}||`,
  }),
  color: (text: string, color?: string) => ({
    offsetStart: color!.length + 2,
    offsetEnd: color!.length + 2 + text.length,
    res: `[${color}]${text || ""}`,
  }),
  gradient: (text: string, colors: string) => ({
    offsetStart: colors.length + 12,
    offsetEnd: colors.length + 12 + "Message".length,
    res: `[gradient: ${colors} ${text || "Message"}]`,
  }),

  timestamp: (
    _text: string,
    schedule?: number,
    type?: (typeof TimestampType)[keyof typeof TimestampType],
  ) => ({
    offsetStart: 5 + schedule!.toString().length,
    offsetEnd: 5 + schedule!.toString().length,
    res: `[${type === TimestampType.RELATIVE ? "tr" : "to"}:${schedule}]`,
  }),
} as const;

const FormatBar = (opts: {
  showFormatBarHtml?: boolean;
  showFormatBarEmoji?: boolean;
  showFormatBarGif?: boolean;
}) => {
  return (
    <div class={style.formatBar}>
      <Button data-action="bold" icon="format_bold" hoverBorder />
      <Button data-action="italic" icon="format_italic" hoverBorder />
      <Button data-action="strikethrough" icon="strikethrough_s" hoverBorder />
      <Button data-action="header" icon="title" hoverBorder />
      <Button data-action="named_link" icon="link" hoverBorder />
      <Button data-action="checkbox" icon="select_check_box" hoverBorder />
      <Button data-action="spoiler" icon="visibility_off" hoverBorder />
      <Button data-action="timestamp" icon="schedule" hoverBorder />
      <Button data-action="color" icon="palette" hoverBorder />
      {opts.showFormatBarHtml && (
        <Button data-action="html" icon="code_xml" hoverBorder />
      )}
      {opts.showFormatBarEmoji && (
        <Button
          data-show-gif={opts.showFormatBarGif}
          data-action="emoji"
          icon="face"
          hoverBorder
        />
      )}
    </div>
  );
};

const applyFormat = ({
  inputEl,
  format,
  color,
  schedule,
  type,
  onTextUpdate,
}: {
  inputEl: HTMLInputElement;
  format: keyof typeof Formats;
  color?: string;
  schedule?: number | string;
  type?: (typeof TimestampType)[keyof typeof TimestampType];
  onTextUpdate: (text: string) => void;
}) => {
  const transformFunc = Formats[format];
  if (!transformFunc) return;

  const start = inputEl.selectionStart!;
  const finish = inputEl.selectionEnd!;
  const allText = inputEl.value;
  const sel = allText.substring(start, finish);

  const modifySel = transformFunc(sel, (schedule || color) as never, type);
  const newText =
    allText.substring(0, start) +
    modifySel.res +
    allText.substring(finish, allText.length);

  inputEl.focus();

  onTextUpdate(newText);
  inputEl.selectionStart = start + modifySel.offsetStart;
  inputEl.selectionEnd = start + modifySel.offsetEnd;
};

interface HandleFormatBarOpts {
  signal: AbortSignal;
  inputContainer: HTMLDivElement;
  onTextUpdate: (text: string) => void;
}

export const handleFormatBar = (opts: HandleFormatBarOpts) => {
  const inputEl = opts.inputContainer.querySelector(
    "input, textarea",
  ) as HTMLInputElement;

  const onEmojiPick = (emoji?: EmojiData, custom?: CustomEmoji) => {
    const shortcode = emoji?.short_names[0] || custom?.name;
    if (!shortcode) return;
    inputEl.focus();
    const selStart = inputEl.selectionStart!;
    const selEnd = inputEl.selectionEnd!;
    inputEl.setRangeText(`:${shortcode}: `, selStart, selEnd, "end");
    opts.onTextUpdate(inputEl.value);
  };

  const onGifPick = (gif: KlipyItem) => {
    inputEl.focus();
    const selStart = inputEl.selectionStart!;
    const selEnd = inputEl.selectionEnd!;
    inputEl.setRangeText(`${gif.url} `, selStart, selEnd, "end");
    opts.onTextUpdate(inputEl.value);
  };

  opts.inputContainer.addEventListener(
    "click",
    (event) => {
      const actionEl = closestFromEvent(event, "[data-action]");
      if (!actionEl) return;

      const action = actionEl.dataset.action as keyof typeof Formats | "emoji";

      if (action === "emoji") {
        const showFormatBarGif = actionEl.dataset.showGif === "true";
        ExpressionPickerLazy({
          targetEl: actionEl,
          tabs: showFormatBarGif ? ["GIFs", "emojis"] : ["emojis"],
          onEmojiPick,
          onGifPick,
        });
        return;
      }

      if (action === "color") {
        createColorPickerModalLazy({
          color: "#ff0000",
          anchor: "top-center",
          gradientTab: true,
          onClose(color, colors) {
            applyFormat({
              inputEl,
              format: colors ? "gradient" : "color",
              onTextUpdate: opts.onTextUpdate,
              color: colors ? colors.join("-") : color,
            });
          },
          triggerEl: actionEl,
        });
        return;
      }
      if (action === "timestamp") {
        createTimeModal({
          onConfirm(event) {
            applyFormat({
              inputEl,
              format: action,
              onTextUpdate: opts.onTextUpdate,
              type: event.type,
              schedule: event.val,
            });
          },
        });
        return;
      }

      applyFormat({
        inputEl,
        format: action,
        onTextUpdate: opts.onTextUpdate,
      });
    },
    { signal: opts.signal },
  );
};
