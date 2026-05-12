import { css } from "@linaria/core";

import { h } from "../h";

type GradientTextProps = Partial<Omit<HTMLSpanElement, keyof HTMLElement>> & {
  children?: any;
  [key: string]: any;
  class?: string | (string | boolean | undefined)[];
  color?: string;
};

const container = css`
  background: var(--color, var(--text-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

export const GradientText = (props: GradientTextProps) => {
  const { children, color, ...rest } = props;

  return (
    <span
      {...rest}
      class={[container, props.class]}
      style={{ "--color": color }}
    >
      {children}
    </span>
  );
};
