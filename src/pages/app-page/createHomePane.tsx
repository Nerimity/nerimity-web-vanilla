import morphdom from "morphdom";

import { Avatar } from "../../components/avatar";
import { Icon } from "../../components/icon";
import { Link } from "../../components/link";
import { buildEmojiUrl } from "../../components/markup/Emoji";
import { getActivityType } from "../../components/userPresence";
import { cdnUrl } from "../../config";
import { Dynamic } from "../../dynamic";
import { h } from "../../h";
import { friendStore } from "../../store/friendStore";
import {
  UserPresenceDetails,
  userPresenceStore,
} from "../../store/userPresenceStore";
import { userStore } from "../../store/userStore";
import type { RawUserActivity } from "../../Types";
import { storeEmitter } from "../../utils/EventEmitter";
import { throttle } from "../../utils/throttle";

import style from "./createHomePane.module.css";

const createHomePane = (content: HTMLElement) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  let el = (
    <div class={style.container}>
      <div class={style.mainContent}>Main Content</div>
      <Sidebar signal={signal} />
    </div>
  ) as HTMLDivElement;

  content.replaceChildren(el);

  const destroy = () => {
    el.remove();
    (el as any) = null;
    abortController.abort();
    (content as any) = null;
  };

  return { destroy };
};

const Sidebar = (props: { signal: AbortSignal }) => {
  let el = (
    <div class={[style.sidebar, "pauseDrawerTouches"]}></div>
  ) as HTMLDivElement;
  let rafId: number | null = null;

  const rerender = () => {
    const activities = (
      [...userPresenceStore.presences.values()]
        .filter((p) => {
          if (userStore.users.get(p.userId)?.bot) return false;
          if (friendStore.isFriendBlocked(p.userId)) return false;
          return p.activities?.length;
        })
        .map((p) => p.activities?.map((a) => ({ ...a, userId: p.userId })))
        .flat() as (RawUserActivity & { userId: string })[]
    ).sort((a, b) => b.startedAt - a.startedAt);

    if (rafId !== null) cancelAnimationFrame(rafId);

    rafId = requestAnimationFrame(() => {
      morphdom(
        el,
        <div>
          {activities.map((activity) => (
            <DashboardUserActivity
              activity={activity}
              userId={activity.userId}
            />
          ))}
        </div>,
        {
          childrenOnly: true,
        },
      );
      rafId = null;
    });
  };

  props.signal.addEventListener(
    "abort",
    () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    },
    { once: true },
  );

  storeEmitter.on(
    "user:presence_update",
    throttle(rerender, 1000, { trailing: true }),
    props.signal,
  );

  storeEmitter.on(
    "ws:authStateUpdate",
    (state) => {
      if (!state) return;
      rerender();
    },
    props.signal,
  );

  rerender();
  return el;
};

const DashboardUserActivity = (props: {
  userId: string;
  activity: RawUserActivity;
}) => {
  const user = userStore.users.get(props.userId);

  const presence = userPresenceStore.presences.get(props.userId);

  const status = UserPresenceDetails[presence?.status || 0];
  const activity = props.activity;

  const type = getActivityType(props.activity);

  const isVideo = type.isVideo && !!activity.startedAt;

  const imgSrc = (() => {
    if (activity.emoji) {
      return buildEmojiUrl({ icon: activity.emoji!, size: 60 * 2 })[0];
    }
    if (!activity.imgSrc) return;
    return `${cdnUrl}proxy/${encodeURIComponent(activity.imgSrc!)}/a`;
  })();

  return (
    <div class={style.userActivityContainer}>
      <Link href={`/app/profile/${user?.id}`} class={style.activityHeader}>
        <Avatar user={user} size={24} />
        <div class={style.username}>{user?.username}</div>
      </Link>
      <div class={style.activityContent} data-has-media={!!imgSrc}>
        {imgSrc && !isVideo && <img src={imgSrc} class={style.activityImage} />}
        <div class={style.activityDetails}>
          {imgSrc && isVideo && (
            <img src={imgSrc} class={style.activityVideo} />
          )}
          <div class={style.activityInfo}>
            <div
              class={style.activityName}
              style={{ "--color": `var(--status-${status.id})` }}
            >
              <Icon name={type.icon} class={style.icon} />
              {props.activity.name}
            </div>

            <Dynamic
              component={props.activity.link ? "a" : "div"}
              data-warn
              href={props.activity.link}
              class={style.title}
              title={props.activity.title}
            >
              {props.activity.title}
            </Dynamic>
          </div>
        </div>
      </div>
    </div>
  );
};

export default createHomePane;
