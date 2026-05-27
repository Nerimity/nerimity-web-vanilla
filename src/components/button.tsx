import { css } from "@linaria/core";

import { Dynamic } from "../dynamic";
import { h } from "../h";
import { Icon } from "./icon";
import { Link } from "./link";

interface ButtonProps {
  icon?: string;
  label?: string;
  class?: string | string[];
  hoverBorder?: boolean;
  primary?: boolean;
  href?: string;
  alert?: boolean;
}
const button = css`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  border: solid 1px var(--gray-700);
  border-radius: var(--radius-6);
  padding: 8px;
  gap: 8px;
  cursor: pointer;
  transition: 0.2s;
  background-color: var(--gray-900);
  .label {
    color: var(--primary-color);
  }
  .icon {
    color: var(--primary-color);
  }
  &:hover {
    background-color: var(--gray-800);
  }
  &.hoverBorder {
    border-color: transparent;
    background-color: transparent;
    &:hover {
      background-color: var(--gray-900);
      border-color: var(--gray-700);
    }
  }
  &.primary {
    background-color: var(--primary-color);
    border: none;
    .label {
      color: var(--text-color);
    }
    .icon {
      color: var(--text-color);
    }
    &:hover {
      opacity: 0.8;
    }
  }
  &.alert {
    .label {
      color: var(--alert-color);
    }
    .icon {
      color: var(--alert-color);
    }
  }
`;
export const Button = (props: ButtonProps) => (
  <Dynamic
    component={props.href ? Link : "button"}
    href={props.href}
    class={[
      button,
      props.class,
      props.hoverBorder && "hoverBorder",
      props.primary && "primary",
      props.alert && "alert",
    ]}
  >
    {props.icon && <Icon class="icon" name={props.icon} />}
    {props.label && <div class="label">{props.label}</div>}
  </Dynamic>
);
