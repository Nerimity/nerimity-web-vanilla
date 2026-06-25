import { Dynamic } from "../dynamic";
import { h } from "../h";

import style from "./gradientText.module.css";

type GradientTextProps = Partial<Omit<HTMLSpanElement, keyof HTMLElement>> & {
  children?: any;
  [key: string]: any;
  class?: string | (string | boolean | undefined)[];
  color?: string | null;
  tag?: keyof HTMLElementTagNameMap | any;
};

export const GradientText = (props: GradientTextProps) => {
  const { children, color, tag, ...rest } = props;

  return (
    <Dynamic
      component={tag || "span"}
      {...rest}
      class={[style.container, props.class]}
      style={{ "--color": color }}
    >
      {children}
    </Dynamic>
  );
};
