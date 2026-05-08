import { h } from "../h";
import { css } from "@linaria/core";

const link = css`
  color: inherit;
  cursor: pointer;
  text-decoration: none;

  &.decoration {
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
      class={[
        link,
        decoration && "decoration",
        ...(Array.isArray(props.class) ? props.class : [props.class]),
      ]}
      data-route
    >
      {children}
    </a>
  );
};
