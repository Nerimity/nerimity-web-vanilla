import type { UserBadge } from "../utils/UserBadgeFlag";
import { Icon } from "./icon";

import style from "./UserBadgeItem.module.css";

export const UserBadgeItem = (props: { badge: UserBadge }) => {
  return (
    <div
      data-bit={props.badge.bit}
      style={{
        background: props.badge.color,
        "--text-color": props.badge.textColor || "var(--gray-800)",
      }}
      class={style.badgeItem}
    >
      {props.badge.icon && <Icon class={style.icon} name={props.badge.icon} />}
      {props.badge.name()}
    </div>
  );
};
