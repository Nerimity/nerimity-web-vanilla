import { t } from "@lingui/core/macro";
import { Trans } from "@trans";
import morphdom from "morphdom";

import { Icon } from "../../components/icon";
import { buildEmojiUrl } from "../../components/markup/Emoji";
import { Markup } from "../../components/markup/markup";
import { NotificationPill } from "../../components/NotificationPill";
import { isNewDay, PostItem } from "../../components/posts/PostItem";
import { PostsArea } from "../../components/posts/PostsArea";
import { SettingsBlock } from "../../components/SettingsBlock";
import { Avatar } from "../../components/ui/avatar";
import { Dropdown } from "../../components/ui/createDropdown";
import { Item } from "../../components/ui/item";
import { Link } from "../../components/ui/link";
import { getActivityType } from "../../components/userPresence";
import { cdnUrl } from "../../config";
import { Dynamic } from "../../dynamic";
import {
  getPostNotificationCount,
  getPostNotifications,
  type DiscoverSort,
} from "../../services/PostService";
import { friendStore } from "../../store/friendStore";
import {
  UserPresenceDetails,
  userPresenceStore,
} from "../../store/userPresenceStore";
import { userStore } from "../../store/userStore";
import {
  PostNotificationType,
  type RawPostNotification,
  type RawUserActivity,
} from "../../Types";
import { dateMarkerLabel, getTime } from "../../utils/date";
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

  const notificationPill = (
    <NotificationPill count={10} class={style.notificationPill} />
  ) as HTMLDivElement;

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
        {notificationPill}
      </Item.Base>
    </div>
  ) as HTMLDivElement;

  getPostNotificationCount().then(([count]) => {
    if (!count) return;
    notificationPill.innerText = count.toLocaleString();
    notificationPill.style.display = count ? "flex" : "none";
  });

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
      postsArea.replaceChildren(<NotificationsArea signal={signal} />);
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

const NotificationsArea = (props: { signal: AbortSignal }) => {
  const el = (
    <div class={style.notificationsContainer}></div>
  ) as HTMLDivElement;
  getPostNotifications().then(([notifications, err]) => {
    if (props.signal.aborted) return;
    if (err) {
      console.error(err);
      return;
    }
    el.replaceChildren(
      <>
        {notifications.map((notification, i) => (
          <NotificationItemItem
            container={el}
            prev={notifications[i - 1]}
            notification={notification}
          />
        ))}
      </>,
    );
  });

  return el;
};

const Transform = (notification: RawPostNotification) => {
  switch (notification.type) {
    case PostNotificationType.LIKED: {
      return {
        icon: "favorite",
        color: "var(--alert-color)",
        title: () => (
          <Trans>
            <Link
              data-user-id={notification.by.id}
              href={`/app/profile/${notification.by.id}`}
            >
              <strong>{notification.by.username}</strong>
            </Link>{" "}
            liked your post
          </Trans>
        ),
      };
    }
    case PostNotificationType.REPLIED: {
      return {
        icon: "reply",
        color: "var(--primary-color)",
        title: () => (
          <Trans>
            <Link
              data-user-id={notification.by.id}
              href={`/app/profile/${notification.by.id}`}
            >
              <strong>{notification.by.username}</strong>
            </Link>{" "}
            replied to your post
          </Trans>
        ),
      };
    }
    case PostNotificationType.FOLLOWED: {
      return {
        icon: "person_add",
        color: "var(--primary-color)",
        title: () => (
          <Trans>
            <Link
              data-user-id={notification.by.id}
              href={`/app/profile/${notification.by.id}`}
            >
              <strong>{notification.by.username}</strong>
            </Link>{" "}
            followed you
          </Trans>
        ),
      };
    }
    case PostNotificationType.REPOSTED: {
      return {
        icon: "repeat",
        color: "var(--success-color)",
        title: () => (
          <Trans>
            <Link
              data-user-id={notification.by.id}
              href={`/app/profile/${notification.by.id}`}
            >
              <strong>{notification.by.username}</strong>
            </Link>{" "}
            reposted your post
          </Trans>
        ),
      };
    }
    case PostNotificationType.MENTIONED: {
      return {
        icon: "alternate_email",
        color: "var(--primary-color)",
        title: () => (
          <Trans>
            <Link
              data-user-id={notification.by.id}
              href={`/app/profile/${notification.by.id}`}
            >
              <strong>{notification.by.username}</strong>
            </Link>{" "}
            mentioned you
          </Trans>
        ),
      };
    }

    default: {
      return {
        icon: "",
        color: "var(--primary-color)",
        title: () => <Trans>Unknown notification</Trans>,
      };
    }
  }
};

const NotificationItemItem = (props: {
  notification: RawPostNotification;
  prev?: RawPostNotification;
  container: HTMLDivElement;
}) => {
  const newDay =
    !props.prev || isNewDay(props.notification, props.prev || { createdAt: 0 });

  const transformed = Transform(props.notification);

  const postContent = props.notification.post?.content;

  const replyOrMentioned =
    props.notification.type === PostNotificationType.REPLIED ||
    props.notification.type === PostNotificationType.MENTIONED;

  return (
    <>
      {newDay && (
        <div class={style.newDay}>
          {dateMarkerLabel(props.notification.createdAt)}
        </div>
      )}

      {replyOrMentioned ? (
        <PostItem
          hideNewDayMarker
          post={props.notification.post}
          container={props.container}
        />
      ) : (
        <SettingsBlock.Root class={style.notificationContainer}>
          <Avatar
            class={style.notificationAvatar}
            user={props.notification.by}
            size={40}
          />

          <div class={style.notificationDetails}>
            <div class={style.innerDetails}>
              <div>{transformed.title()}</div>
              {postContent && !replyOrMentioned && (
                <Markup class={style.postContent} inline text={postContent} />
              )}
            </div>
          </div>
          <div class={style.time}>{getTime(props.notification.createdAt)}</div>
        </SettingsBlock.Root>
      )}
    </>
  );
};
