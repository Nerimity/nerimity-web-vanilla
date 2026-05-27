import { css } from "@linaria/core";

import { Dynamic } from "../dynamic";
import { h } from "../h";
import { Link } from "./link";

interface BaseProps {
  selected?: boolean;
  alert?: boolean;
  children?: any;
  class?: string | (string | undefined | boolean)[];
  disabled?: boolean;
  href?: string;
  [key: string]: any;
}

const item = css`
  position: relative;
  display: flex;
  align-items: center;
  padding: 10px 20px;
  border-radius: var(--radius-10);
  &:not([data-disabled="true"]) {
    cursor: pointer;
  }
  gap: 10px;

  &:before {
    position: absolute;
    left: 0;
    width: 4px;
    height: 0;
    border-radius: var(--radius-max);
    opacity: 0;
    background-color: var(--primary-color);
    content: "";
    transition: 0.2s;
  }
  &:not([data-disabled="true"]) {
    &:hover {
      background-color: var(--item-bg);
      &:before {
        height: 20%;
        opacity: 1;
        background-color: var(--gray-500);
      }
      .label {
        color: var(--text-color);
      }
    }
    &[data-selected="true"] {
      background-color: var(--item-bg);
      &:before {
        height: 40%;
        opacity: 1;
        background-color: var(--primary-color);
      }
      .label {
        color: var(--text-color);
      }
    }
    &[data-alert="true"] {
      &:before {
        height: 40%;
        opacity: 1;
        background-color: var(--alert-color);
      }
    }
  }

  .label {
    color: var(--text-muted);
    font-size: var(--size);
  }
`;

export const Item = {
  Base(props: BaseProps) {
    const {
      selected,
      class: className,
      alert,
      children,
      disabled,
      ...rest
    } = props;
    return (
      <Dynamic
        component={props.href ? Link : "div"}
        href={props.href}
        class={["item", item, className]}
        data-selected={selected}
        data-disabled={disabled}
        data-alert={alert}
        {...rest}
      >
        {children}
      </Dynamic>
    );
  },
  Icon() {
    return <div>Icon</div>;
  },
  Label(props: {
    children: any;
    size?: number;
    class?: string | (string | boolean | undefined)[];
  }) {
    return (
      <div
        class={["label", props.class]}
        style={{ "--size": props.size && props.size + "px" }}
      >
        {props.children}
      </div>
    );
  },
};
