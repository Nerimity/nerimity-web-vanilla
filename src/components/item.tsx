import style from "./item.module.css";
import { h } from "../h";

interface BaseProps {
  selected?: boolean;
  children?: JSX.Element;
  class?: string | string[];
}
export const Item = {
  Base(props: BaseProps) {
    return (
      <div
        class={[
          "item",
          style.item,
          ...(Array.isArray(props.class) ? props.class : [props.class]),
        ]}
        data-selected={props.selected}
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
        class={[
          style.label,
          ...(Array.isArray(props.class) ? props.class : [props.class]),
        ]}
        style={{ "--size": props.size && props.size + "px" }}
      >
        {props.children}
      </div>
    );
  },
};
