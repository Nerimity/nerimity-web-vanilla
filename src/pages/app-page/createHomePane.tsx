import { t } from "@lingui/core/macro";
import morphdom from "morphdom";

import { Avatar } from "../../components/avatar";
import { Icon } from "../../components/icon";
import { Item } from "../../components/item";
import { Link } from "../../components/link";
import { buildEmojiUrl } from "../../components/markup/Emoji";
import { PostsArea } from "../../components/posts/PostsArea";
import { getActivityType } from "../../components/userPresence";
import { cdnUrl } from "../../config";
import { Dynamic } from "../../dynamic";
import { friendStore } from "../../store/friendStore";
import {
  UserPresenceDetails,
  userPresenceStore,
} from "../../store/userPresenceStore";
import { userStore } from "../../store/userStore";
import type { RawUserActivity } from "../../Types";
import { storeEmitter } from "../../utils/EventEmitter";
import { getFont } from "../../utils/font";
import { throttle } from "../../utils/throttle";
import type { RouteContext } from "./AppPage";

import style from "./createHomePane.module.css";

const createHomePane = ({ content }: RouteContext) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  let el = (
    <div class={style.container}>
      <div class={style.mainContent}>
        <PostSection signal={signal} />
      </div>
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
            <HomeUserActivity activity={activity} userId={activity.userId} />
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

export default createHomePane;

const HomeUserActivity = (props: {
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

  const font = getFont(user?.profile?.font);

  return (
    <div class={style.userActivityContainer}>
      <Link href={`/app/profile/${user?.id}`} class={style.activityHeader}>
        <Avatar user={user} size={24} />
        <div class={[style.username, font?.class, "font"]}>
          {user?.username}
        </div>
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
              style={{ "--color": `var(--status-${status.id.toLowerCase()})` }}
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

const PostSection = (props: { signal: AbortSignal }) => {
  let currentTab: "feed" | "discover" | "notifications" = "feed";
  let tabs = (
    <div class={style.postTabs}>
      <Item.Base selected handlePosition="bottom" data-tab="feed">
        <Item.Icon name="group" />
        <Item.Label>{t`Following`}</Item.Label>
      </Item.Base>
      <Item.Base handlePosition="bottom" data-tab="discover">
        <Item.Icon name="public" />
        <Item.Label>{t`Feed`}</Item.Label>
      </Item.Base>
      <Item.Base handlePosition="bottom" data-tab="notifications">
        <Item.Icon name="notifications" />
        <Item.Label>{t`Notifications`}</Item.Label>
      </Item.Base>
    </div>
  ) as HTMLDivElement;

  tabs.addEventListener(
    "click",
    (e) => {
      const tab = (e.target as HTMLElement)
        .closest("[data-tab]")
        ?.getAttribute("data-tab");
      if (tab && tab !== currentTab) {
        currentTab = tab as "feed" | "discover" | "notifications";
        rerender();
      }
    },
    {
      signal: props.signal,
    },
  );

  let postsArea = (<div></div>) as HTMLDivElement;

  let el = (
    <div>
      {tabs}
      {postsArea}
    </div>
  ) as HTMLDivElement;

  let postsAc = new AbortController();
  let signal = postsAc.signal;

  const rerender = () => {
    postsAc.abort();
    postsAc = new AbortController();
    signal = postsAc.signal;

    tabs.querySelectorAll("[data-tab]").forEach((e) => {
      const tabEl = e as HTMLElement;
      tabEl.dataset.selected =
        tabEl.getAttribute("data-tab") === currentTab ? "true" : "false";
    });

    if (currentTab === "notifications") {
      postsArea.replaceChildren();
      return;
    }

    postsArea.replaceChildren(<PostsArea signal={signal} type={currentTab} />);
  };

  rerender();

  props.signal.addEventListener(
    "abort",
    () => {
      tabs.remove();
      postsArea.remove();
      el.remove();

      (tabs as any) = null;
      (postsArea as any) = null;
      (el as any) = null;

      postsAc.abort();
    },
    { signal },
  );

  return el;
};
