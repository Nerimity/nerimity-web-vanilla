import { t } from "@lingui/core/macro";

import { h, Fragment } from "../h";
import {
  UserPresenceDetails,
  userPresenceStore,
} from "../store/userPresenceStore";
import { userStore } from "../store/userStore";
import type { RawUserActivity } from "../Types";
import { formatTimestamp } from "../utils/date";
import { Icon } from "./icon";
import { Markup } from "./markup/markup";

import style from "./userPresence.module.css";

const getActivityLabel = (
  activity: RawUserActivity | undefined,
  type: ActivityType,
  showAction?: boolean,
) => {
  if (!activity) return null;
  const title = activity?.title;
  const name = activity?.name;
  const subtitle = activity?.subtitle;

  if (name && !showAction) return name;

  if (type.isMusic || type.isVideo) {
    return title + (subtitle ? ` - ${subtitle}` : "");
  }

  const sub =
    title?.trim() && subtitle?.trim()
      ? `${title} - ${subtitle}`
      : title || subtitle;
  return name + (sub ? ` - ${sub}` : "");
};

export const UserPresence = (props: {
  userId: string;
  showOffline?: boolean;
  hideActivity?: boolean;
  activity?: RawUserActivity;
  hideCount?: boolean;
  showAction?: boolean;
  iconColor?: string;
  class?: string | (string | boolean | undefined)[];
  hideCustomStatus?: boolean;
}) => {
  const presence = userPresenceStore.presences.get(props.userId);
  const status = UserPresenceDetails[presence?.status || 0];

  let label = status.text;
  if (!props.hideCustomStatus && presence?.custom) {
    label = presence.custom;
  }

  if (!presence?.status) {
    const user = userStore.users.get(props.userId);
    if (user?.lastOnlineAt) {
      label = t`Last online ${formatTimestamp(user.lastOnlineAt)}`;
    } else {
      if (!props.showOffline) return null;
    }
  }
  const activity = props.hideActivity
    ? undefined
    : props.activity || presence?.activities?.[0];
  const activityType = getActivityType(activity);

  const activityLabel = getActivityLabel(
    activity,
    activityType,
    !props.showAction,
  );

  const countEl =
    !props.hideCount && activity && presence?.activities?.length! > 1 ? (
      <span class={[style.count, "count"]}>
        +{presence?.activities!.length! - 1}
      </span>
    ) : null;

  return (
    <span
      class={[style.userPresence, props.class]}
      style={{
        "--color":
          props.iconColor || `var(--status-${status.id.toLowerCase()})`,
      }}
    >
      {activityLabel ? (
        <>
          <Icon class={[style.icon, "icon"]} name={activityType.icon} />
          {countEl}
          <span class={[style.text, "text"]}>
            {props.showAction && activity?.action ? (
              <span class={style.action}>{activity.action} </span>
            ) : null}
            {activityLabel}
          </span>
        </>
      ) : (
        <>
          <div class={[style.dot, "dot"]}></div>
          {countEl}
          <Markup class={[style.text, "text"]} text={label} inline />
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
  const action = activity?.action.toLowerCase();

  const isMusic = action?.startsWith("listening to");
  const isVideo = action?.startsWith("watching");
  const isProgramming =
    action?.startsWith("programming") || action?.startsWith("coding");

  const isDrawing = action?.startsWith("drawing");

  if (isDrawing) return { icon: "brush", isGame: true };
  if (isProgramming) return { icon: "terminal", isGame: true };
  if (isMusic) return { icon: "music_note", isMusic: true };
  if (isVideo) return { icon: "movie", isVideo: true };
  return { icon: "gamepad", isGame: true };
}
