import { css } from "@linaria/core";

import { h } from "../h";
import { scoped } from "../utils/css";
import { Icon } from "./icon";

const checkboxContainer = css`
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  font-size: 12px;

  &:hover {
    .${scoped`checkbox`} {
      background: var(--gray-600);
      .${scoped`icon`} {
        font-size: 10px;
        opacity: 0.2;
      }
    }
  }

  &[data-checked="true"] {
    .${scoped`checkbox`} {
      background: var(--primary-color);
      .${scoped`icon`} {
        font-size: 10px;
        opacity: 1;
      }
    }
  }
  .${scoped`checkbox`} {
    border-radius: 2px;
    background: var(--gray-700);
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border-radius: var(--radius-4);

    .${scoped`icon`} {
      font-size: 10px;
      opacity: 0;
    }
  }
`;

const Root = (props: {
  checked?: boolean;
  [key: string]: any;
  children?: any;
}) => {
  const { checked, children, ...rest } = props;
  return (
    <div class={checkboxContainer} data-checked={checked} {...rest}>
      {children}
    </div>
  );
};

const Label = (props: { children: any }) => {
  return <div>{props.children}</div>;
};

const Box = () => {
  return (
    <div class={scoped`checkbox`}>
      <Icon class={scoped`icon`} name="check" />
    </div>
  );
};

const createHandler = (opts: {
  el: HTMLDivElement;
  onChange: (checked: boolean, el: HTMLElement) => void;
  signal: AbortSignal;
}) => {
  opts.el.addEventListener(
    "click",
    (el) => {
      const target = el.target as HTMLElement;
      const checkEl = target?.closest(
        `.${checkboxContainer}`,
      ) as HTMLDivElement;
      if (checkEl) {
        const checked = checkEl.dataset.checked === "true" ? false : true;

        checkEl.dataset.checked = `${checked}`;

        opts.onChange(checked, checkEl);
      }
    },
    { signal: opts.signal },
  );
};

export const Checkbox = {
  Root,
  Label,
  Box,
  createHandler,
};
