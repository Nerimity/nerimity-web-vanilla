import { css } from "@linaria/core";

import { h } from "../h";

const link = css`
  color: inherit;
  cursor: pointer;
  text-decoration: none;
  &:hover {
    text-decoration: none;
  }

  &.decoration {
    color: var(--primary-color);
    &:hover {
      text-decoration: underline;
    }
  }
`;

type LinkProps = Partial<Omit<HTMLAnchorElement, keyof HTMLElement>> & {
  children?: any;
  [key: string]: any;
  decoration?: boolean;
  class?: string | (string | boolean | undefined)[];
};

export const Link = (props: LinkProps) => {
  const { children, decoration, ...rest } = props;

  return (
    <a
      {...rest}
      class={[link, decoration && "decoration", props.class]}
      data-route
    >
      {children}
    </a>
  );
};
