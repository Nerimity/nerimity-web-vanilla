import { css } from "@linaria/core";

import { h } from "../h";

const inputContainer = css`
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
}
export const Input = (props: InputProps) => {
  return (
    <div class={[inputContainer, props.class]}>
      {props.prefix}
      <input type="text" />
      {props.suffix}
    </div>
  );
};
