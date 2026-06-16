import { h } from "../h";

import style from "./link.module.css";

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
      class={[style.link, decoration && style.decoration, props.class]}
      data-route
    >
      {children}
    </a>
  );
};
