import { h } from "../h";
import {
  UserPresenceDetails,
  userPresenceStore,
} from "../store/userPresenceStore";
import { Markup } from "./markup/markup";

import style from "./userPresence.module.css";

export const UserPresence = (props: {
  userId: string;
  showOffline?: boolean;
}) => {
  const presence = userPresenceStore.presences.get(props.userId);
  const status = UserPresenceDetails[presence?.status || 0];

  if (!presence && !props.showOffline) {
    return null;
  }

  let label = status.text;
  if (presence?.custom) {
    label = presence.custom;
  }

  return (
    <span class={style.userPresence}>
      <div
        class={style.dot}
        style={{ background: `var(--status-${status.id})` }}
      ></div>
      <Markup class={style.text} text={label} inline />
    </span>
  );
};
