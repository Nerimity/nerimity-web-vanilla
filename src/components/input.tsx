import { Dynamic } from "../dynamic";
import { h } from "../h";
import { createResizeObserver } from "../utils/observer";

import style from "./input.module.css";

interface InputProps {
  class?: string | string[];
  prefix?: any;
  suffix?: any;
  label?: any;
  type?: "text" | "password" | "textarea";
  autocomplete?: "current-password" | "email";
  placeholder?: string;
  id?: string;
}
export const Input = (props: InputProps) => {
  return (
    <div class={[style.inputContainer, props.class]}>
      {props.label && <div class="label">{props.label}</div>}
      <div class={style.inputInnerContainer}>
        {props.prefix}
        <Dynamic
          id={props.id}
          placeholder={props.placeholder}
          class={["input", style.input]}
          component={props.type === "textarea" ? "textarea" : "input"}
          type={props.type || "text"}
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
