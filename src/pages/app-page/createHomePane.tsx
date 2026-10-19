import { t } from "@lingui/core/macro";
import morphdom from "morphdom";

import { Icon } from "../../components/icon";
import { buildEmojiUrl } from "../../components/markup/Emoji";
import { PostsArea } from "../../components/posts/PostsArea";
import { Avatar } from "../../components/ui/avatar";
import { Dropdown } from "../../components/ui/createDropdown";
import { Item } from "../../components/ui/item";
import { Link } from "../../components/ui/link";
import { getActivityType } from "../../components/userPresence";
import { cdnUrl } from "../../config";
import { Dynamic } from "../../dynamic";
import type { DiscoverSort } from "../../services/PostService";
import { friendStore } from "../../store/friendStore";
import {
  UserPresenceDetails,
  userPresenceStore,
} from "../../store/userPresenceStore";
import { userStore } from "../../store/userStore";
import type { RawUserActivity } from "../../Types";
import { storeEmitter } from "../../utils/EventEmitter";
import { getFont } from "../../utils/font";
import { getLocalItem, setLocalItem } from "../../utils/localStorage";
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
  type Tab = "feed" | "discover" | "notifications";
  let currentTab: Tab = "feed";
  let tabs = (
    <div class={style.postTabs}>
      <Item.Base handlePosition="bottom" data-value="discover">
        <Item.Icon name="public" />
        <Item.Label>{t`Feed`}</Item.Label>
      </Item.Base>
      <Item.Base handlePosition="bottom" data-value="feed">
        <Item.Icon name="group" />
        <Item.Label>{t`Following`}</Item.Label>
      </Item.Base>
      <Item.Base handlePosition="bottom" data-value="notifications">
        <Item.Icon name="notifications" />
        <Item.Label>{t`Notifications`}</Item.Label>
      </Item.Base>
    </div>
  ) as HTMLDivElement;

  let postsArea = (<div></div>) as HTMLDivElement;

  let dropdownSelectedId: DiscoverSort = getLocalItem(
    "discoverSort",
    "mostLiked7Days",
  )!;

  const DropdownItems = [
    { id: "", label: t`Latest` },
    { id: "mostLiked7Days", label: t`Liked in 7 Days` },
    { id: "mostLiked30days", label: t`Liked in 30 Days` },
    { id: "mostLikedAllTime", label: t`Liked All Time` },
  ];

  const dropdown = Dropdown.create({
    initialSelectedId() {
      return dropdownSelectedId;
    },
    onChange(id) {
      dropdownSelectedId = id as DiscoverSort;
      setLocalItem("discoverSort", dropdownSelectedId);
      rerender();
    },
    signal: props.signal,
    items() {
      return DropdownItems.map((item) => (
        <Dropdown.Item id={item.id}>
          <Dropdown.Label>{item.label}</Dropdown.Label>
        </Dropdown.Item>
      ));
    },
  });

  let el = (
    <div class={style.postContainer} data-current-tab={currentTab}>
      {tabs}
      <div class={style.postDropdown}>{dropdown.el}</div>
      {postsArea}
    </div>
  ) as HTMLDivElement;

  let postsAc = new AbortController();
  let signal = postsAc.signal;

  const rerender = () => {
    postsArea.replaceChildren();
    postsAc.abort();
    postsAc = new AbortController();
    signal = postsAc.signal;

    el.dataset.currentTab = currentTab;

    if (currentTab === "notifications") {
      return;
    }

    const posts =
      currentTab === "discover" ? (
        <PostsArea type="discover" sort={dropdownSelectedId} signal={signal} />
      ) : (
        <PostsArea type="feed" signal={signal} />
      );

    postsArea.replaceChildren(posts);
  };

  Item.handler<Tab>({
    signal: props.signal,
    container: tabs,
    initialTab: currentTab,
    onChange(tab) {
      if (tab === currentTab) return;
      currentTab = tab;
      rerender();
    },
  });

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
