import { css } from "@linaria/core";

import { Dynamic } from "../dynamic";
import { h } from "../h";
import { createResizeObserver } from "../utils/observer";

const inputContainer = css`
  display: flex;
  flex-direction: column;
  gap: 6px;
  .inputInnerContainer {
    display: flex;
    align-items: center;

    background-color: var(--input-background-color);
    border: solid 1px var(--gray-700);
    border-radius: var(--radius-6);
    overflow: hidden;
    transition: 0.2s border-bottom-color;
    &:has(input:focus) {
      border-bottom-color: var(--primary-color);
    }
  }
  .input {
    padding: 8px;
    color: var(--text-color);
    outline: none;
    border: none;
    background: transparent;
    width: 100%;
    resize: none;
  }
`;

interface InputProps {
  class?: string | string[];
  prefix?: any;
  suffix?: any;
  label?: any;
  type?: "text" | "password" | "textarea";
  autocomplete?: "current-password" | "email";
}
export const Input = (props: InputProps) => {
  return (
    <div class={[inputContainer, props.class]}>
      {props.label && <div class="label">{props.label}</div>}
      <div class="inputInnerContainer">
        {props.prefix}
        <Dynamic
          class="input"
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
  const textarea = opts.textarea;

  const adjust = () => {
    textarea.style.height = "34px";
    textarea.style.height = textarea.scrollHeight + "px";
  };

  requestAnimationFrame(adjust);

  createResizeObserver(textarea, adjust, { signal: opts.signal });
  opts.textarea.addEventListener("input", adjust, { signal: opts.signal });
  return { adjust };
};
