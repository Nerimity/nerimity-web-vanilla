import { t } from "@lingui/core/macro";
import { Plural, Trans } from "@trans";

import { Avatar } from "../../../components/avatar";
import { Banner } from "../../../components/Banner";
import { Button } from "../../../components/button";
import { Drawer } from "../../../components/drawer";
import { Icon } from "../../../components/icon";
import { Link } from "../../../components/link";
import { Markup } from "../../../components/markup/markup";
import { ServerClanItem } from "../../../components/serverClanItem";
import { updateActivity, UserActivity } from "../../../components/UserActivity";
import { createUserContextMenuHandler } from "../../../components/UserContextMenu";
import { UserPresence } from "../../../components/userPresence";
import { Dynamic } from "../../../dynamic";
import {
  acceptFriend,
  addFriend,
  removeFriend,
} from "../../../services/friendService";
import {
  followUser,
  getUserDetails,
  unfollowUser,
  type UserDetails,
} from "../../../services/userService";
import { accountStore } from "../../../store/accountStore";
import { Friend, friendStore } from "../../../store/friendStore";
import { inboxStore } from "../../../store/inboxStore";
import { serverStore } from "../../../store/serverStore";
import { userPresenceStore } from "../../../store/userPresenceStore";
import { User, userStore } from "../../../store/userStore";
import { FriendStatus, type RawUser } from "../../../Types";
import { hasBit } from "../../../utils/bitwise";
import { createWidthQuery } from "../../../utils/createWidthQuery";
import { formatTimestamp, getDaysAgo } from "../../../utils/date";
import { createEventEmitter, storeEmitter } from "../../../utils/EventEmitter";
import { FocusAnimator } from "../../../utils/FocusAnimator";
import { getFont } from "../../../utils/font";
import { getRecentServerChannelId } from "../../../utils/recentServerChannels";
import { router } from "../../../utils/router";
import { UserBadgeValues, type UserBadge } from "../../../utils/UserBadgeFlag";
import type { RouteContext } from "../AppPage";
import { createRemoveFriendModal } from "./removeFriendModal";

import style from "./createProfilePane.module.css";

let contentAbortController: AbortController | undefined = undefined;
let sidebarAbortController: AbortController | undefined = undefined;

export const emitter = createEventEmitter<{
  follow_state_changed: null;
}>();

const Content = (opts: {
  userDetails?: UserDetails;
  user?: RawUser;
  mobile: boolean;
}) => {
  const { userDetails, user } = opts;
  contentAbortController?.abort();
  contentAbortController = new AbortController();

  const { signal } = contentAbortController;

  if (!user) return null;

  const presenceContainer = (<div></div>) as HTMLDivElement;

  const renderPresence = () =>
    presenceContainer.replaceChildren(
      <UserPresence showOffline userId={user.id} hideActivity />,
    );
  renderPresence();

  storeEmitter.on(
    "user:presence_update",
    (event) => {
      if (event.userId !== user.id) return;
      renderPresence();
    },
    signal,
  );

  return (
    <div class={style.content}>
      <div class={style.banner}>
        <Banner user={user} />
      </div>
      <div class={style.overlayInfo}>
        <Avatar user={user} size={128} />
      </div>
      {!opts.mobile && (
        <Actions details={userDetails} user={opts.user} signal={signal} />
      )}
      <div class={[style.section, style.detailsSection]}>
        <NameAndTag details={userDetails} user={user} />
        {presenceContainer}
        <Stats details={userDetails} signal={signal} />
      </div>
      {opts.mobile && (
        <Actions
          mobile
          details={userDetails}
          user={opts.user}
          signal={signal}
        />
      )}
      <Bio userDetails={userDetails} />
      {opts.mobile && <Sidebar {...opts} mobile />}
    </div>
  );
};

const Bio = ({ userDetails }: { userDetails?: UserDetails }) => {
  const bio = userDetails?.profile?.bio;

  if (!bio) return null;

  return (
    <div class={[style.section, style.bioSection]}>
      {userDetails?.profile?.bio && (
        <div class={style.bio}>
          <Markup text={bio} />
        </div>
      )}
    </div>
  );
};

const NameAndTag = ({
  user,
  details,
}: {
  user: RawUser;
  details?: UserDetails;
}) => {
  const font = getFont(user?.profile?.font || details?.profile?.font);

  return (
    <div class={style.nameAndTag}>
      <span class={[style.username, font?.class, "font"]}>{user.username}</span>
      <span class={style.tag}>:{user.tag}</span>
      <span class={style.badges}>
        {details?.profile?.clan && (
          <span class={style.clan}>
            <ServerClanItem clan={details?.profile?.clan} />
          </span>
        )}
        {details?.followsYou && (
          <span class={style.followsYou}>{t`Follows You`}</span>
        )}
      </span>
    </div>
  );
};

const Actions = ({
  user,
  details,
  signal,
  mobile,
}: {
  user?: RawUser;
  details?: UserDetails;
  signal: AbortSignal;
  mobile?: boolean;
}) => {
  const getFriendButtonState = (friend?: Friend) => {
    const blocked = friend?.status === FriendStatus.BLOCKED;
    const pending = friend?.status === FriendStatus.PENDING;
    const sent = friend?.status === FriendStatus.SENT;
    const friends = friend?.status === FriendStatus.FRIENDS;

    if (blocked) return { action: "unblock", icon: "block", label: t`Unblock` };
    if (pending)
      return {
        action: "accept_friend",
        icon: "check",
        label: t`Accept Request`,
      };
    if (sent)
      return {
        action: "remove_sent",
        icon: "close",
        label: t`Remove Request`,
        alert: true,
      };
    if (friends)
      return {
        action: "remove_friend",
        icon: "person_add_disabled",
        label: t`Remove Friend`,
        alert: true,
      };
    return { action: "add_friend", icon: "group_add", label: t`Add Friend` };
  };

  const el = (
    <div class={[style.actions, mobile && style.mobileActions]}></div>
  ) as HTMLDivElement;

  const rerender = () => {
    const isFollowing = !!details?.user.followers.length;
    const friend = friendStore.friends.get(user?.id!);

    const isCurrent = accountStore.currentUser?.id === user?.id;
    const bot = user?.bot;
    const friendButtonState = getFriendButtonState(friend);
    const authenticated = accountStore.authenticated;
    el.replaceChildren(
      <>
        <div class={style.actionsInner}>
          {details && isFollowing && (
            <ActionButton
              action="unfollow"
              alert
              icon="do_not_disturb_on"
              label={t`Unfollow`}
            />
          )}
          {accountStore.authenticated &&
            !isFollowing &&
            !isCurrent &&
            details && (
              <ActionButton
                action="follow"
                icon="add_circle"
                label={t`Follow`}
              />
            )}
          {authenticated && !bot && !isCurrent && (
            <ActionButton {...friendButtonState} />
          )}
          <ActionButton
            action="message"
            icon={isCurrent ? "book" : "mail"}
            label={isCurrent ? t`Notes` : t`Message`}
          />
          <ActionButton userId={user?.id!} action="more" icon="more_horiz" />
        </div>
      </>,
    );
  };
  rerender();

  el.addEventListener(
    "click",
    async (event) => {
      const target = event.target as HTMLDivElement;
      const button = target.closest("[data-action]") as HTMLDivElement;
      const action = button?.dataset?.action;
      if (action === "message") {
        inboxStore.openChannel(user?.id!);
        return;
      }
      if (action === "follow") {
        const [, error] = await followUser(user?.id!);
        if (error) {
          alert(error.message);
        }
        if (details) {
          details.user.followers = [1];
        }

        emitter.emit("follow_state_changed");
        rerender();

        return;
      }
      if (action === "unfollow") {
        const [, error] = await unfollowUser(user?.id!);
        if (error) {
          alert(error.message);
        }
        if (details) {
          details.user.followers = [];
        }
        emitter.emit("follow_state_changed");
        rerender();
        return;
      }
      if (action === "add_friend") {
        addFriend({
          username: user?.username!,
          tag: user?.tag!,
        });
      }
      if (action === "remove_sent") {
        removeFriend(user?.id!);
      }
      if (action === "remove_friend") {
        createRemoveFriendModal({ userId: user?.id! });
      }
      if (action === "accept_friend") {
        acceptFriend({ userId: user?.id! });
      }
    },
    { signal },
  );
  createUserContextMenuHandler({
    mode: "click",
    data: { details },
    el,
    signal,
  });

  storeEmitter.on(
    "friend:request",
    (event) => {
      if (event.friend.recipientId === user?.id) {
        rerender();
      }
    },
    signal,
  );

  return el;
};

const ActionButton = (props: {
  icon?: string;
  label?: string;
  alert?: boolean;
  action: string;
  userId?: string;
}) => {
  return (
    <Button
      hoverBorder
      data-action={props.action}
      label={props.label}
      icon={props.icon}
      alert={props.alert}
      data-user-id={props.userId}
    />
  );
};

const Stats = ({
  details,
  signal,
}: {
  details?: UserDetails;
  signal: AbortSignal;
}) => {
  const el = (<div class={style.stats}></div>) as HTMLDivElement;

  const rerender = () => {
    const followers = details?.user._count?.followers;
    const following = details?.user._count?.following;

    const hideFollowers = details?.hideFollowers;
    const hideFollowing = details?.hideFollowing || details?.user.bot;
    const showStats = details && (!hideFollowers || !hideFollowing);

    if (!showStats) return null;
    el.replaceChildren(
      <>
        {!hideFollowers && (
          <span class={style.stat}>
            <Plural
              value={followers || 0}
              _0={
                <Trans>
                  <span class={style.full}>No</span> Followers
                </Trans>
              }

              one={
                <Trans>
                  <span class={style.full}>#</span> Follower
                </Trans>
              }
              other={
                <Trans>
                  <span class={style.full}>#</span> Followers
                </Trans>
              }
            />
          </span>
        )}
        {!hideFollowing && (
          <span class={style.stat}>
            <Trans>
              <span class={style.full}>{following}</span> Following
            </Trans>
          </span>
        )}
      </>,
    );
  };

  rerender();
  emitter.on(
    "follow_state_changed",
    async () => {
      const [newDetails] = await getUserDetails({ userId: details?.user.id! });
      if (newDetails) details = newDetails;
      rerender();
    },
    signal,
  );

  return el;
};

const BadgeItem = (props: { badge: UserBadge }) => {
  return (
    <div
      data-bit={props.badge.bit}
      style={{ background: props.badge.color, color: props.badge.textColor }}
      class={style.badgeItem}
    >
      {props.badge.icon && <Icon class={style.icon} name={props.badge.icon} />}
      {props.badge.name()}
    </div>
  );
};
const Sidebar = (opts: {
  mobile?: boolean;
  userDetails?: UserDetails;
  user?: RawUser;
}) => {
  sidebarAbortController?.abort();
  sidebarAbortController = new AbortController();
  const { signal } = sidebarAbortController;

  const isCurrentUser = accountStore.currentUser?.id === opts.user?.id;

  const bot = opts.userDetails?.user.bot;

  return (
    <div class={style.sidebar}>
      <SidebarJoined user={opts.user} signal={signal} />
      {bot && <SidebarBotCreator details={opts.userDetails!} />}
      <SidebarBadges user={opts.user} signal={signal} />
      <SidebarActivity user={opts.user} signal={signal} />
      {!isCurrentUser && accountStore.authenticated && (
        <>
          <MutualList
            friendIds={opts.userDetails?.mutualFriendIds}
            signal={signal}
            mobile={opts.mobile}
          />
          <MutualList
            serverIds={opts.userDetails?.mutualServerIds}
            signal={signal}
            mobile={opts.mobile}
          />
        </>
      )}
    </div>
  );
};

const SidebarBotCreator = (opts: { details: UserDetails }) => {
  const user = opts.details.user.application?.creatorAccount.user as User;
  return (
    <div class={[style.sidebarItem, style.mutual, style.botCreator]}>
      <div class={style.title}>
        <Icon name="group" class={style.icon} />
        {t`Bot Creator`}
      </div>
      <div class={style.mutualList}>
        <MutualItem user={user!} />
      </div>
    </div>
  );
};
const MutualList = (opts: {
  friendIds?: string[];
  serverIds?: string[];
  signal: AbortSignal;
  mobile?: boolean;
}) => {
  let collapsed = !!opts.mobile;

  if (!opts.friendIds?.length && !opts.serverIds?.length) return null;

  let itemsEl = (<div class={style.mutualList}></div>) as HTMLDivElement;

  let titleEl = (
    <div class={style.title}>
      <Icon name="group" class={style.icon} />
      {opts.friendIds ? t`Mutual Friends` : t`Mutual Servers`}
      <Icon class={style.expandIcon} name="keyboard_arrow_down" />
    </div>
  );

  const el = (
    <div class={[style.sidebarItem, style.mutual]}>
      {titleEl}
      {itemsEl}
    </div>
  ) as HTMLDivElement;

  const rerender = () => {
    el.classList.toggle(style.expanded!, collapsed);
    itemsEl.style.display = collapsed ? "none" : "flex";
    itemsEl.replaceChildren(
      <>
        {!collapsed && opts.friendIds?.map((id) => <MutualItem userId={id} />)}
        {!collapsed &&
          opts.serverIds?.map((id) => <MutualItem serverId={id} />)}
      </>,
    );
  };
  rerender();

  titleEl.addEventListener(
    "click",
    () => {
      collapsed = !collapsed;
      rerender();
    },
    { signal: opts.signal },
  );

  return el;
};

const MutualItem = (props: {
  userId?: string;
  serverId?: string;
  user?: User;
}) => {
  const user = userStore.users.get(props.userId!) || props.user;
  const server = serverStore.servers.get(props.serverId!);
  if (!user && !server) return null;

  const name = user?.username || server?.name;
  const font = user ? getFont(user?.profile?.font) : undefined;

  return (
    <Dynamic
      component={Link}
      data-no-mini={!!user}
      data-user-id={user?.id}
      href={
        user
          ? `/app/profile/${user.id}`
          : `/app/servers/${server?.id}/${getRecentServerChannelId(server?.id!)}`
      }
      class={style.mutualItem}
    >
      <Avatar size={26} server={server} user={user} />
      <span class={[font?.class, "font"]}>{name}</span>
    </Dynamic>
  );
};

const SidebarJoined = (opts: { user?: RawUser; signal: AbortSignal }) => {
  let fullDate = true;
  const infoEl = (<div class={style.info}></div>) as HTMLDivElement;

  const el = (
    <div class={[style.sidebarItem, style.joinedAtItem]}>
      <div class={style.title}>
        <Icon name="calendar_month" class={style.icon} />
        {t`Joined Nerimity`}
      </div>
      {infoEl}
    </div>
  ) as HTMLDivElement;

  const toggle = () => {
    const joinedAt = opts.user?.joinedAt || 0;
    fullDate = !fullDate;
    infoEl.replaceChildren(
      fullDate ? formatTimestamp(joinedAt) : getDaysAgo(joinedAt),
    );
  };
  toggle();

  el.addEventListener("click", toggle, { signal: opts.signal });

  return el;
};

const SidebarBadges = (props: { user?: RawUser; signal: AbortSignal }) => {
  const enabledBadges = UserBadgeValues.filter((b) =>
    hasBit(props.user?.badges, b.bit),
  );

  let earnedBadges: UserBadge[] = [];
  let Badges: UserBadge[] = [];
  if (!enabledBadges.length) return null;

  for (let i = 0; i < enabledBadges.length; i++) {
    const badge = enabledBadges[i]!;
    if (badge.type === "earned") {
      earnedBadges.push(badge);
    } else {
      Badges.push(badge);
    }
  }

  const showSeparator = !!(earnedBadges.length && Badges.length);

  return (
    <div class={style.sidebarItem}>
      <div class={style.title}>
        <Icon name="social_leaderboard" class={style.icon} />
        {t`Badges`}
      </div>
      <div class={style.badgesContainer}>
        {earnedBadges.map((b) => (
          <BadgeItem badge={b} />
        ))}
        {showSeparator && <div class={style.separator} />}
        {Badges.map((b) => (
          <BadgeItem badge={b} />
        ))}
      </div>
    </div>
  );
};

const SidebarActivity = (props: { user?: RawUser; signal: AbortSignal }) => {
  let activitiesContainer = (
    <div class={style.activities}></div>
  ) as HTMLDivElement;

  const rerender = () => {
    const presence = userPresenceStore.presences.get(props.user?.id!);
    const activities = presence?.activities || [];
    activitiesContainer.style.display = activities.length ? "flex" : "none";
    activitiesContainer.replaceChildren(
      ...activities.map((activity) => (
        <UserActivity
          class={style.sidebarItem + " " + style.activity}
          activity={activity}
          userId={props.user?.id!}
        />
      )),
    );
  };
  rerender();

  const intervalId = setInterval(() => {
    const activitiesEl = document.querySelector(`.${style.activities}`);
    if (!activitiesEl) return;

    const activities = [...activitiesEl.children!];
    for (let i = 0; i < activities.length; i++) {
      const activityEl = activities[i] as HTMLDivElement;
      updateActivity(activityEl);
    }
  }, 1000);
  props.signal.addEventListener("abort", () => clearInterval(intervalId), {
    once: true,
  });

  rerender();
  storeEmitter.on(
    "user:presence_update",
    (event) => {
      if (event.userId !== props.user?.id!) return;
      rerender();
    },
    props.signal,
  );

  return activitiesContainer;
};

const createProfilePane = ({ content }: RouteContext) => {
  Drawer().updatePage({ page: 1 });
  const abortController = new AbortController();
  const { signal } = abortController;

  let localUser: undefined | User = undefined;
  let userDetails: undefined | UserDetails = undefined;

  const widthQuery = createWidthQuery(1220);

  const getUser = () => userDetails?.user || localUser;

  const focusAnim = new FocusAnimator(content, "img");

  const fetchUser = async () => {
    const param = router.match<{ userId: string }>("/app/profile/:userId");
    const userId = param?.params.userId;
    if (!userId) return rerender();
    localUser = userStore.users.get(userId);
    rerender();

    const [details, error] = await getUserDetails({ userId });
    if (error) return;
    userDetails = details;
    rerender();
  };

  const rerender = () => {
    if (signal.aborted) return;
    const desktop = widthQuery.matches;

    let el = (
      <div class={[style.container, !desktop && style.mobile]}>
        <Content user={getUser()} userDetails={userDetails} mobile={!desktop} />
        {desktop && <Sidebar user={getUser()} userDetails={userDetails} />}
      </div>
    ) as HTMLDivElement;

    const colorOne = userDetails?.profile?.bgColorOne || "#000000";
    const colorTwo = userDetails?.profile?.bgColorTwo || "#000000";

    const bg = `linear-gradient(180deg, ${colorOne}, ${colorTwo})`;

    if (content.parentElement && userDetails) {
      if (userDetails?.profile?.primaryColor) {
        content.parentElement.style.setProperty(
          "--primary-color",
          userDetails.profile.primaryColor,
        );
      }
      Drawer().content.style.setProperty("--content-bg-color", bg);
      Drawer().content.classList.add("showBg");
    }

    content.replaceChildren(el);
    focusAnim.trigger();
  };

  userDetails = undefined;
  localUser = undefined;
  requestAnimationFrame(() => {
    Drawer().content.classList.remove("showBg");
    Drawer().content.style.removeProperty("--primary-color");
  });
  fetchUser();

  storeEmitter.on("ws:authStateUpdate", rerender, signal);

  widthQuery.onModeChange(rerender, signal);

  signal.addEventListener(
    "abort",
    () => {
      requestAnimationFrame(() => {
        Drawer().content.classList.remove("showBg");
        Drawer().content.style.removeProperty("--primary-color");
      });
    },
    { once: true },
  );

  const destroy = () => {
    focusAnim.destroy();

    contentAbortController?.abort();
    sidebarAbortController?.abort();
    abortController.abort();

    content.replaceChildren();
    (content as any) = null;
  };

  return { destroy };
};
export default createProfilePane;
