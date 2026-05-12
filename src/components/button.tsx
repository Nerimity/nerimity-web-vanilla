import { css } from "@linaria/core";

import { h } from "../h";
import { Icon } from "./icon";

interface ButtonProps {
  icon?: string;
  label?: string;
  class?: string | string[];
  hoverBorder?: boolean;
}
const button = css`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  border: solid 1px var(--gray-400);
  border-radius: var(--radius-6);
  padding: 8px;
  cursor: pointer;
  transition: 0.2s;
  .icon {
    color: var(--primary-color);
  }
  &:hover {
    background-color: var(--gray-800);
  }
  &.hoverBorder {
    border-color: transparent;
    &:hover {
      border-color: var(--gray-700);
    }
  }
`;
export const Button = (props: ButtonProps) => (
  <button class={[button, props.class, props.hoverBorder && "hoverBorder"]}>
    {props.icon && <Icon class="icon" name={props.icon} />}
    {props.label}
  </button>
);
