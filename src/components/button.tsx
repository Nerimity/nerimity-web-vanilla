import { Dynamic } from "../dynamic";
import { h } from "../h";
import { Icon } from "./icon";
import { Link } from "./link";

import style from "./button.module.css";

interface ButtonProps {
  icon?: string;
  label?: string;
  class?: string | string[];
  hoverBorder?: boolean;
  primary?: boolean;
  href?: string;
  alert?: boolean;
  [key: string]: any;
}

export const Button = (props: ButtonProps) => {
  const {
    hoverBorder,
    alert,
    primary,
    label,
    icon,
    class: className,
    ...rest
  } = props;
  return (
    <Dynamic
      component={rest.href ? Link : "button"}
      class={[
        style.button,
        className,
        hoverBorder && style.hoverBorder,
        primary && style.primary,
        alert && style.alert,
        "button",
      ]}
      {...rest}
    >
      {icon && <Icon class={style.icon} name={icon} />}
      {label && <div class={[style.label, "label"]}>{label}</div>}
    </Dynamic>
  );
};
