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
    ...props
  }: {
    children: any;
    clickable?: boolean;
    href?: string;
    [key: string]: any;
  }) => {
    const isClickable = clickable || props.href;

    return (
      <Dynamic
        component={props.href ? Link : "div"}
        class={[style.settingsBlock, isClickable && style.clickable]}
        {...props}
      >
        {children}
        {isClickable && <Icon name="chevron_forward" />}
      </Dynamic>
    );
  },
  Icon: (props: { name: string }) => {
    return <MaterialIcon class={style.icon} name={props.name} />;
  },
  Details: (props: { title: string; description?: string }) => {
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
