import { css } from "@linaria/core";

import { h } from "../h";

interface BaseProps {
  selected?: boolean;
  alert?: boolean;
  children?: JSX.Element;
  class?: string | string[];
  disabled?: boolean;
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
  transition: 0.2s;
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
  &:hover:not([data-disabled="true"]) {
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
  .label {
    color: var(--text-muted);
    transition: 0.2s;
    font-size: var(--size);
  }
`;

export const Item = {
  Base(props: BaseProps) {
    return (
      <div
        class={["item", item, props.class]}
        data-selected={props.selected}
        data-disabled={props.disabled}
        data-alert={props.alert}
      >
        {props.children}
      </div>
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
