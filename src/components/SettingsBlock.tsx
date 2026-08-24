import { Icon, Icon as MaterialIcon } from "./icon";

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
    [key: string]: any;
  }) => {
    return (
      <div
        class={[style.settingsBlock, clickable && style.clickable]}
        {...props}
      >
        {children}
        {clickable && <Icon name="chevron_forward" />}
      </div>
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
