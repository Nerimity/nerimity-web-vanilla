import { Dynamic } from "../dynamic";
import type { CustomEmoji, EmojiData } from "../utils/emojis";
import { createResizeObserver } from "../utils/observer";
import { Button } from "./button";
import { createColorPickerModalLazy } from "./createColorPickerLazy";
import { ExpressionPickerLazy } from "./ExpressionPickerLazy";
import { createTimeModal } from "./TimeModal";

import style from "./input.module.css";

interface InputProps {
  class?: string | string[];
  prefix?: any;
  suffix?: any;
  label?: any;
  type?: "text" | "password" | "textarea";
  autocomplete?: "current-password" | "new-password" | "email";
  placeholder?: string;
  id?: string;
  value?: string;
  maxLength?: number;
  showFormatBar?: boolean;
  showFormatBarHtml?: boolean;
  showFormatBarEmoji?: boolean;
}
export const Input = (props: InputProps) => {
  return (
    <div class={[style.inputContainer, props.class]}>
      {props.label && <div class="label">{props.label}</div>}
      {props.showFormatBar && (
        <FormatBar
          showFormatBarEmoji={props.showFormatBarEmoji}
          showFormatBarHtml={props.showFormatBarHtml}
        />
      )}

      <div class={[style.inputInnerContainer, "inputContainer"]}>
        {props.prefix}
        <Dynamic
          id={props.id}
          placeholder={props.placeholder}
          maxlength={props.maxLength}
          class={["input", style.input]}
          component={props.type === "textarea" ? "textarea" : "input"}
          type={props.type || "text"}
          value={props.type != "textarea" ? props.value : undefined}
          autocomplete={props.autocomplete}
        >
          {props.type === "textarea" ? props.value || "" : ""}
        </Dynamic>
        {props.suffix}
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
        <Button data-action="emoji" icon="face" hoverBorder />
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

  opts.inputContainer.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLDivElement;
      const actionEl = target.closest("[data-action]") as HTMLDivElement;
      if (!actionEl) return;

      const action = actionEl.dataset.action as keyof typeof Formats | "emoji";

      if (action === "emoji") {
        ExpressionPickerLazy({
          targetEl: actionEl,

          onEmojiPick,
        });
        return;
      }

      if (action === "color") {
        createColorPickerModalLazy({
          color: "#ff0000",
          anchor: "top-center",
          onClose(color) {
            applyFormat({
              inputEl,
              format: action,
              onTextUpdate: opts.onTextUpdate,
              color,
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
