import style from "./link.module.css";
import { h } from "../h";

type LinkProps = Partial<Omit<HTMLAnchorElement, keyof HTMLElement>> & {
  children?: JSX.Element;
  [key: string]: any;
  decoration?: boolean;
};

export const Link = (props: LinkProps) => {
  const { children, ...rest } = props;

  return (
    <a
      {...rest}
      class={[style.link, props.decoration && style.decoration]}
      data-route
    >
      {children}
    </a>
  );
};
