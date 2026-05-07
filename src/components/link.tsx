import style from "./link.module.css";
import { h } from "../h";

type LinkProps = Partial<Omit<HTMLAnchorElement, keyof HTMLElement>> & {
  children?: JSX.Element;
  [key: string]: any;
  decoration?: boolean;
  class?: string | (string | boolean | undefined)[];
};

export const Link = (props: LinkProps) => {
  const { children, ...rest } = props;

  return (
    <a
      {...rest}
      class={[
        style.link,
        props.decoration && style.decoration,
        ...(Array.isArray(props.class) ? props.class : [props.class]),
      ]}
      data-route
    >
      {children}
    </a>
  );
};
