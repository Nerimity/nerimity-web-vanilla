import { Dynamic } from "../dynamic";
import { h } from "../h";
import { Link } from "./link";

import style from "./item.module.css";

interface BaseProps {
  selected?: boolean;
  alert?: boolean;
  children?: any;
  class?: string | (string | undefined | boolean)[];
  disabled?: boolean;
  href?: string;
  [key: string]: any;
}

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
        class={["item", style.item, className]}
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
        class={[style.label, props.class]}
        style={{ "--size": props.size && props.size + "px" }}
      >
        {props.children}
      </div>
    );
  },
};
