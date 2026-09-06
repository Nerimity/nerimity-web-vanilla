import { Dynamic } from "../dynamic";
import { Icon, Icon as MaterialIcon } from "./icon";
import { Link } from "./link";

import style from "./SettingsBlock.module.css";

export const SettingsBlock = {
  Group: ({ children, ...props }: { children: any; [key: string]: any }) => {
    return (
      <div
        {...props}
        class={[style.settingsBlockGroup, "settingsBlockGroup", props.class]}
      >
        {children}
      </div>
    );
  },
  Root: ({
    children,
    clickable,
    hideArrow,
    expandable,
    ...props
  }: {
    children: any;
    clickable?: boolean;
    hideArrow?: boolean;
    expandable?: boolean;
    href?: string;
    [key: string]: any;
  }) => {
    const isClickable = expandable || clickable || props.href;

    const component = (() => {
      if (props.href) {
        const external =
          props.href.startsWith("http://") || props.href.startsWith("https://");
        if (external) return "a";
        return Link;
      }
      return "div";
    })();

    const external = component === "a";

    return (
      <Dynamic
        component={component}
        data-expanded={false}
        {...(external ? { target: "_blank" } : {})}

        class={[
          style.settingsBlock,
          isClickable && style.clickable,
          expandable && style.expandable,
          "settingsBlock",
        ]}
        {...props}
      >
        {children}
        {!hideArrow && isClickable && (
          <Icon
            class={style.actionIcon}
            name={
              external
                ? "open_in_new"
                : expandable
                  ? "keyboard_arrow_down"
                  : "chevron_forward"
            }
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
