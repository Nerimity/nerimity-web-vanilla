import { Icon } from "../components/icon";
import { type BasicBadge } from "../utils/UserBadgeFlag";

import style from "./BasicBorder.module.css";

export const BasicBorder = (props: { children: any; border?: BasicBadge }) => {
  return (
    <div
      class={style.container}
      style={{ "--color": props.border?.assets.color }}
    >
      <div class={style.border}></div>
      <Icon class={style.icon} name={props.border?.assets.icon!} />
      {props.children}
    </div>
  );
};
