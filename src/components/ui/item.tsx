import { Dynamic } from "../../dynamic";
import { getClosestElementFromEvent } from "../../utils/dom";
import { Icon as MaterialIcon } from "../icon";
import { Link } from "./link";

import style from "./item.module.css";

interface BaseProps {
  selected?: boolean;
  alert?: boolean;
  children?: any;
  class?: string | (string | undefined | boolean)[];
  disabled?: boolean;
  href?: string;
  handlePosition?: "left" | "bottom"; // default: left
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
      handlePosition = "left",
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
        data-handle-position={handlePosition}
        {...rest}
      >
        {children}
      </Dynamic>
    );
  },
  Icon(props: { name: string }) {
    return <MaterialIcon class={style.icon} name={props.name} />;
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
  handler<T extends string>(opts: {
    signal: AbortSignal;
    container: HTMLDivElement;
    initialTab: T;
    onChange: (value: T) => void;
  }) {
    const updateSelected = (isSelected: (item: HTMLDivElement) => boolean) => {
      opts.container
        .querySelectorAll<HTMLDivElement>(`.${style.item}`)
        .forEach((item) => {
          item.dataset.selected = String(isSelected(item));
        });
    };
    let selectedValue = opts.initialTab;
    const update = (value?: T) => {
      if (value !== undefined) selectedValue = value;
      updateSelected((item) => item.dataset.value === selectedValue);
    };

    update();
    opts.onChange(opts.initialTab);

    opts.container.addEventListener(
      "click",
      (e) => {
        const clickedItem = getClosestElementFromEvent(e, `.${style.item}`);
        if (!clickedItem) return;
        selectedValue = clickedItem.dataset.value as T;
        opts.onChange(selectedValue);
        updateSelected((item) => item === clickedItem);
      },
      { signal: opts.signal },
    );
    return { update };
  },
};
