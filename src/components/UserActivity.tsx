import { cdnUrl } from "../config";
import { h } from "../h";
import type { RawUserActivity } from "../Types";
import {
  calculateTimeElapsedForActivityStatus,
  formatTimestamp,
} from "../utils/date";
import { buildEmojiUrl } from "./markup/Emoji";
import { getActivityType, UserPresence } from "./userPresence";

import style from "./UserActivity.module.css";

const playingFor = (activity: RawUserActivity, isMusic?: boolean) => (
  <div
    class={style.playingFor}
    title={formatTimestamp(activity.startedAt || 0)}
  >
    {calculateTimeElapsedForActivityStatus(activity.startedAt, isMusic)}
  </div>
);

export const UserActivity = ({
  userId,
  activity,
}: {
  userId: string;
  activity: RawUserActivity;
}) => {
  const activityType = getActivityType(activity);

  const isMusic =
    activityType.isMusic && !!activity.startedAt && !!activity.endsAt;
  const isVideo =
    activityType.isVideo && !!activity.startedAt && !!activity.endsAt;

  const isLiveStream = activityType.isVideo && !activity.endsAt;

  const imgSrc = (() => {
    if (activity.emoji) {
      return buildEmojiUrl({ icon: activity.emoji!, size: 60 * 2 })[0];
    }
    if (!activity.imgSrc) return;
    return `${cdnUrl}proxy/${encodeURIComponent(activity.imgSrc!)}/a`;
  })();

  const showRich = imgSrc || activity.title || activity.subtitle;

  return (
    <div class={style.userActivity} data-rich={!!showRich}>
      <UserPresence
        class={style.userPresence}
        iconColor="var(--primary-color)"
        activity={activity}
        userId={userId}
        hideCount
        showAction
      />
      {showRich && (
        <div class={style.richActivity}>
          {imgSrc && (
            <img
              src={imgSrc}
              class={style.activityImage}
              data-video={isVideo || isLiveStream}
            />
          )}
          <div class={style.richDetails}>
            {(activity.title || activity.name) && (
              <div class={style.title}>{activity.title || activity.name}</div>
            )}
            {activity.subtitle && (
              <div class={style.subtitle}>{activity.subtitle}</div>
            )}
            {!isMusic && !isVideo && playingFor(activity, isMusic)}
          </div>
        </div>
      )}
      {!showRich && !isMusic && !isVideo && playingFor(activity, isMusic)}
    </div>
  );
};
