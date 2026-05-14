import { css } from "@linaria/core";

import { h } from "../h";

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
  input {
    padding: 8px;
    color: var(--text-color);
    outline: none;
    border: none;
    background: transparent;
    width: 100%;
  }
`;

interface InputProps {
  class?: string | string[];
  prefix?: any;
  suffix?: any;
  label?: any;
  type?: "text" | "password";
}
export const Input = (props: InputProps) => {
  return (
    <div class={[inputContainer, props.class]}>
      {props.label && <div class="label">{props.label}</div>}
      <div class="inputInnerContainer">
        {props.prefix}
        <input type={props.type || "text"} />
        {props.suffix}
      </div>
    </div>
  );
};
