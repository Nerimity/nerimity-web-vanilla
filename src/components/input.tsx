import { Dynamic } from "../dynamic";
import { createResizeObserver } from "../utils/observer";

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
}
export const Input = (props: InputProps) => {
  return (
    <div class={[style.inputContainer, props.class]}>
      {props.label && <div class="label">{props.label}</div>}
      <div class={[style.inputInnerContainer, "inputContainer"]}>
        {props.prefix}
        <Dynamic
          id={props.id}
          placeholder={props.placeholder}
          maxlength={props.maxLength}
          class={["input", style.input]}
          component={props.type === "textarea" ? "textarea" : "input"}
          type={props.type || "text"}
          value={props.value}
          autocomplete={props.autocomplete}
        />
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
