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
  nameOnly?: boolean,
) => {
  if (!activity) return null;
  const title = activity?.title;
  const name = activity?.name;
  if (name && nameOnly) return name;
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
  activity?: RawUserActivity;
  hideCount?: boolean;
  showAction?: boolean;
  iconColor?: string;
  class?: string | (string | boolean | undefined)[];
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

  const activity = props.hideActivity
    ? undefined
    : props.activity || presence?.activities?.[0];
  const activityType = getActivityType(activity);

  const activityLabel = getActivityLabel(
    activity,
    activityType,
    props.showAction,
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
      style={{ "--color": props.iconColor || `var(--status-${status.id})` }}
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
