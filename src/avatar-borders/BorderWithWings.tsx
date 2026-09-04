import { UserBadges, type UserBadge } from "../utils/UserBadgeFlag";

import style from "./BorderWithWings.module.css";

export const BorderWithWings = (props: {
  children: any;
  border?: UserBadge;
}) => {
  // data-d: disable animation
  return (
    <div
      class={style.container}
      data-d={props.border?.bit === UserBadges.PALESTINE.bit}
    >
      <img
        class={style.border}
        src={`/avatar/borders/${props.border?.assets?.border}.webp`}
      />
      <img
        class={[style.wing, style.left]}
        src={`/avatar/borders/${props.border?.assets?.border}-left-wing.webp`}
      />
      <img
        class={[style.wing, style.right]}
        src={`/avatar/borders/${props.border?.assets?.border}-right-wing.webp`}
      />
      {props.children}
    </div>
  );
};
