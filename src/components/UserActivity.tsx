import morphdom from "morphdom";

import { cdnUrl } from "../config";
import { Dynamic } from "../dynamic";
import { h } from "../h";
import type { RawUserActivity } from "../Types";
import {
  calculateTimeElapsedForActivityStatus,
  formatMillisElapsedDigital,
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

const mediaProgressInfo = (activity: RawUserActivity) => {
  const currentTime = calculateTimeElapsedForActivityStatus(
    activity.startedAt,
    true,
    activity.speed || 1,
    activity.updatedAt,
  );

  const diff = activity.endsAt! - activity.startedAt;
  const endsAt = formatMillisElapsedDigital(diff);

  let start = Date.now() - activity.startedAt;

  const speed = activity.speed ? activity.speed * 1 : 1;

  if (activity.updatedAt) {
    const seeked = activity.updatedAt - activity.startedAt;
    const seekedWithSpeed = seeked * speed;
    const seekedSpeed = -(seeked - seekedWithSpeed);
    start = start * speed - seekedSpeed;
  }

  const end = activity.endsAt! - activity.startedAt;

  const percent = Math.round((start / end) * 100);

  return { percent, currentTime, duration: endsAt };
};

const mediaProgress = (activity: RawUserActivity) => {
  const info = mediaProgressInfo(activity);

  return (
    <div class={style.progressContainer}>
      <div class={style.info}>
        <div>{info.currentTime}</div>
        <div>{info.duration}</div>
      </div>
      <div class={style.progressBar}>
        <div class={style.progress} style={{ width: `${info.percent}%` }} />
      </div>
    </div>
  );
};

const activityMap = new WeakMap<Element, RawUserActivity>();

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

  const el = (
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
              <Dynamic
                component={activity.link ? "a" : "div"}
                class={style.title}
                data-warn
                href={activity.link}
              >
                {activity.title || activity.name}
              </Dynamic>
            )}
            {activity.subtitle && (
              <div class={style.subtitle}>{activity.subtitle}</div>
            )}
            {!isMusic && !isVideo && playingFor(activity, isMusic)}
            {(isMusic || isVideo) && mediaProgress(activity)}
          </div>
        </div>
      )}
      {!showRich && !isMusic && !isVideo && playingFor(activity, isMusic)}
    </div>
  ) as HTMLDivElement;

  activityMap.set(el, activity);

  return el;
};

export const updateActivity = (activityEl: HTMLDivElement) => {
  const activity = activityMap.get(activityEl);
  if (!activity) return;
  const activityType = getActivityType(activity);

  const playingForEl = activityEl.querySelector(
    `.${style.playingFor}`,
  ) as HTMLDivElement;
  if (playingForEl) {
    const isMusic =
      activityType.isMusic && !!activity.startedAt && !!activity.endsAt;
    playingForEl.replaceWith(playingFor(activity, isMusic));
  }
  const progressContainerEl = activityEl.querySelector(
    `.${style.progressContainer}`,
  ) as HTMLDivElement;
  if (progressContainerEl) {
    morphdom(progressContainerEl, mediaProgress(activity));
  }
};
