import { h, Fragment } from "../h";
import {
  UserPresenceDetails,
  userPresenceStore,
} from "../store/userPresenceStore";
import type { RawUserActivity } from "../Types";
import { Icon } from "./icon";
import { Markup } from "./markup/markup";

import style from "./userPresence.module.css";

const getActivityLabel = (
  activity: RawUserActivity | undefined,
  type: ActivityType,
) => {
  if (!activity) return null;
  const title = activity?.title;
  const name = activity?.name;
  const subtitle = activity?.subtitle;
  if (!title) return name;

  if (type.isMusic || type.isVideo) {
    return title + (subtitle ? ` - ${subtitle}` : "");
  }
};

export const UserPresence = (props: {
  userId: string;
  showOffline?: boolean;
  hideActivity?: boolean;
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

  const activity = props.hideActivity ? undefined : presence?.activities?.[0];
  const activityType = getActivityType(activity);
  const activityLabel = getActivityLabel(activity, activityType);

  const countEl =
    activity && presence?.activities?.length! > 1 ? (
      <span class={style.count}>+{presence?.activities!.length}</span>
    ) : null;

  return (
    <span
      class={style.userPresence}
      style={{ "--color": `var(--status-${status.id})` }}
    >
      {activityLabel ? (
        <>
          <Icon class={style.icon} name={activityType.icon} />
          {countEl}
          <span class={style.text}>{activityLabel}</span>
        </>
      ) : (
        <>
          <div class={style.dot}></div>
          {countEl}
          <Markup class={style.text} text={label} inline />
        </>
      )}
    </span>
  );
};

export interface ActivityType {
  icon: string;
  isMusic?: boolean;
  isGame?: boolean;
  isVideo?: boolean;
}

export function getActivityType(activity?: RawUserActivity): ActivityType {
  const action = activity?.action;

  const isMusic = action?.startsWith("Listening to");
  const isVideo = action?.startsWith("Watching");
  const isProgramming =
    action?.startsWith("Programming") || action?.startsWith("Coding");

  if (isProgramming) return { icon: "terminal", isGame: true };
  if (isMusic) return { icon: "music_note", isMusic: true };
  if (isVideo) return { icon: "movie", isVideo: true };
  return { icon: "gamepad", isGame: true };
}
