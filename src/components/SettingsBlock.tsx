import { Dynamic } from "../dynamic";
import { Icon, Icon as MaterialIcon } from "./icon";
import { Link } from "./link";

import style from "./SettingsBlock.module.css";

export const SettingsBlock = {
  Group: (props: { children: any }) => {
    return <div class={style.settingsBlockGroup}>{props.children}</div>;
  },
  Root: ({
    children,
    clickable,
    expandable,
    ...props
  }: {
    children: any;
    clickable?: boolean;
    expandable?: boolean;
    href?: string;
    [key: string]: any;
  }) => {
    const isClickable = expandable || clickable || props.href;

    return (
      <Dynamic
        component={props.href ? Link : "div"}
        class={[
          style.settingsBlock,
          isClickable && style.clickable,
          expandable && style.expandable,
        ]}
        {...props}
      >
        {children}
        {isClickable && (
          <Icon
            data-expanded={false}
            name={expandable ? "keyboard_arrow_down" : "chevron_forward"}
          />
        )}
      </Dynamic>
    );
  },
  Icon: (props: { name: string; alert?: boolean }) => {
    return (
      <MaterialIcon
        class={[style.icon, props.alert && style.alert]}
        name={props.name}
      />
    );
  },
  Details: (props: { title: any; description?: string }) => {
    return (
      <div class={style.details}>
        <div>{props.title}</div>
        {props.description && (
          <div class={style.description}>{props.description}</div>
        )}
      </div>
    );
  },
};
