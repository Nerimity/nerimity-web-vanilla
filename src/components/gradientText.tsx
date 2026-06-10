import { css } from "@linaria/core";

import { Dynamic } from "../dynamic";
import { h } from "../h";

type GradientTextProps = Partial<Omit<HTMLSpanElement, keyof HTMLElement>> & {
  children?: any;
  [key: string]: any;
  class?: string | (string | boolean | undefined)[];
  color?: string;
  tag?: keyof HTMLElementTagNameMap | any;
};

const container = css`
  background: var(--color, var(--text-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

export const GradientText = (props: GradientTextProps) => {
  const { children, color, tag, ...rest } = props;

  return (
    <Dynamic
      component={tag || "span"}
      {...rest}
      class={[container, props.class]}
      style={{ "--color": color }}
    >
      {children}
    </Dynamic>
  );
};
