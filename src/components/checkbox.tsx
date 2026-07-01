import { h } from "../h";
import { Icon } from "./icon";

import style from "./checkbox.module.css";

const Root = (props: {
  checked?: boolean;
  [key: string]: any;
  children?: any;
}) => {
  const { checked, children, ...rest } = props;
  return (
    <div
      data-checked={checked}
      {...rest}
      class={[style.checkboxContainer, props.class]}
    >
      {children}
    </div>
  );
};

const Label = (props: { children: any }) => {
  return <div>{props.children}</div>;
};

const Box = () => {
  return (
    <div class={style.checkbox}>
      <Icon class={style.icon} name="check" />
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
        `.${style.checkboxContainer}`,
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
