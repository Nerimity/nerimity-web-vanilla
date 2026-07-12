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

const playingForInfo = (activity: RawUserActivity) => {
  return {
    title: formatTimestamp(activity.startedAt || 0),
    text: calculateTimeElapsedForActivityStatus(activity.startedAt, true),
  };
};

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

const MediaProgress = () => {
  return (
    <div class={style.progressContainer}>
      <div class={style.info}>
        <div></div>
        <div></div>
      </div>
      <div class={style.progressBar}>
        <div class={style.progress} />
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
            {!isMusic && !isVideo && <div class={style.playingFor}></div>}
            {(isMusic || isVideo) && MediaProgress()}
          </div>
        </div>
      )}
      {!showRich && !isMusic && !isVideo && (
        <div class={style.playingFor}></div>
      )}
    </div>
  ) as HTMLDivElement;

  activityMap.set(el, activity);
  updateActivity(el);

  return el;
};

export const updateActivity = (activityEl: HTMLDivElement) => {
  const activity = activityMap.get(activityEl);
  if (!activity) return;

  const playingForEl = activityEl.querySelector(
    `.${style.playingFor}`,
  ) as HTMLDivElement;
  if (playingForEl) {
    const info = playingForInfo(activity);

    playingForEl.title = info.title;
    playingForEl.textContent = info.text;
  }

  const progressContainerEl = activityEl.querySelector(
    `.${style.progressContainer}`,
  ) as HTMLDivElement;

  if (progressContainerEl) {
    const info = mediaProgressInfo(activity);

    const infoEl = progressContainerEl.querySelector(`.${style.info}`);
    const currentTimeEl = infoEl?.firstElementChild;
    const durationEl = infoEl?.lastElementChild;
    const progressBarEl = progressContainerEl.querySelector(
      `.${style.progress}`,
    ) as HTMLDivElement;

    requestAnimationFrame(() => {
      if (currentTimeEl) {
        currentTimeEl.textContent = info.currentTime;
      }
      if (durationEl) {
        durationEl.textContent = info.duration;
      }

      if (progressBarEl) {
        progressBarEl.style.width = `${info.percent}%`;
      }
    });
  }
};
