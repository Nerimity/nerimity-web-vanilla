import { Dynamic } from "../dynamic";
import { Icon } from "./icon";
import { Link } from "./link";

import style from "./button.module.css";

interface ButtonProps {
  icon?: string;
  label?: string;
  class?: string | (string | false | undefined)[];
  hoverBorder?: boolean;
  primary?: boolean;
  href?: string;
  alert?: boolean;
  warn?: boolean;
  success?: boolean;
  component?: any;
  [key: string]: any;
}

export const Button = (props: ButtonProps) => {
  const {
    hoverBorder,
    component,
    alert,
    warn,
    success,
    primary,
    label,
    icon,
    class: className,
    ...rest
  } = props;
  return (
    <Dynamic
      component={component || (rest.href ? Link : "button")}
      class={[
        style.button,
        className,
        hoverBorder && style.hoverBorder,
        primary && style.primary,
        alert && style.alert,
        warn && style.warn,
        success && style.success,
        "button",
      ]}
      {...rest}
    >
      {icon && <Icon class={[style.icon, "icon"]} name={icon} />}
      {label && <div class={[style.label, "label"]}>{label}</div>}
    </Dynamic>
  );
};
