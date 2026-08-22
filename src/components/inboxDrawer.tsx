import { ph, t } from "@lingui/core/macro";

import { acceptFriend, removeFriend } from "../services/friendService";
import { Channel, channelStore } from "../store/channelStore";
import { Friend, friendStore } from "../store/friendStore";
import { Inbox, inboxStore } from "../store/inboxStore";
import {
  MessageMention,
  messageMentionStore,
} from "../store/messageMentionStore";
import { userPresenceStore } from "../store/userPresenceStore";
import { User, userStore } from "../store/userStore";
import { FriendStatus, type RawUser } from "../Types";
import { storeEmitter } from "../utils/EventEmitter";
import { getFont } from "../utils/font";
import { HoverAnimator } from "../utils/HoverAnimator";
import { reconcile } from "../utils/html";
import { ManualMemo } from "../utils/memo";
import { router } from "../utils/router";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { Drawer } from "./drawer";
import { Icon } from "./icon";
import { Item } from "./item";
import { Link } from "./link";
import { NotificationPill } from "./NotificationPill";
import { UserPresence as UserPresenceItem } from "./userPresence";

import style from "./inboxDrawer.module.css";

const TabItem = (props: {
  name: string;
  icon: string;
  selected?: boolean;
  count?: number;
}) => {
  return (
    <button class={style.tabItem} data-selected={props.selected}>
      <Icon class={style.icon} name={props.icon} />
      <span class={style.name}>{props.name}</span>
      {!!props.count && (
        <NotificationPill count={props.count} class={style.pill} />
      )}
    </button>
  );
};

const UserItem = (props: {
  inbox?: InboxItem;
  user: RawUser;
  friendItem?: FriendItem;
}) => {
  const channelId =
    props.friendItem?.inbox?.channelId ||
    (props.inbox?.type === 1 ? props.inbox?.channelId : undefined);

  const count = props.inbox?.count ?? props.friendItem?.count;

  const font = getFont(props.user?.profile?.font);

  const friendStatus = props.friendItem?.friend.status;

  const sentRequest = friendStatus === FriendStatus.SENT;
  const pendingRequest = friendStatus === FriendStatus.PENDING;

  return (
    <Item.Base
      selected={channelStore.currentChannelId === channelId}
      href={channelId && `/app/inbox/${channelId}`}
      class={style.inboxItem}
      data-channel-id={channelId || props.inbox?.channelId}
      data-user-id={props.user.id}
      alert={!!count || sentRequest || pendingRequest}
    >
      <Link href={`/app/profile/${props.user.id}`}>
        <Avatar user={props.user} size={28} />
      </Link>
      <div class={style.info}>
        <div class={[style.username, font?.class, "font"]}>
          {props.user?.username}
        </div>
        <UserPresenceItem userId={props.user.id} />
      </div>
      <div class={style.right}>
        {count && <NotificationPill class={style.pill} count={count} />}
        {props.inbox && <Button class={style.closeButton} icon="close" alert />}
        {pendingRequest && (
          <Button
            data-action="req-accept"
            class={style.requestButton}
            icon="check"
          />
        )}
        {(pendingRequest || sentRequest) && (
          <Button
            data-action="req-cancel"
            class={style.requestButton}
            icon="close"
            alert
          />
        )}
      </div>
    </Item.Base>
  );
};

const FriendItem = (item: FriendItem) => {
  return <UserItem user={item.user} friendItem={item} />;
};
const InboxItem = (item: InboxItem) => {
  return <UserItem inbox={item} user={item.user} />;
};

const updateSelectedItem = (container?: HTMLElement) => {
  if (!container) return;
  const channelId = channelStore.currentChannelId;
  const oldSelected = container.querySelector(`[data-selected="true"]`);
  oldSelected?.removeAttribute("data-selected");
  if (!channelId) return;
  const newSelected = container.querySelector(
    `[data-channel-id="${channelId}"]`,
  );
  if (newSelected) newSelected.setAttribute("data-selected", "true");
};

type InboxItem =
  | {
      type: 0;
      channelId: string;
      user: RawUser;
      count?: number;
    }
  | {
      type: 1;
      channelId: string;
      channel: Channel;
      inbox: Inbox;
      user: RawUser;
      count?: number;
    };
const createInboxList = () => {
  const inboxListEl = (<div class={style.inboxList}></div>) as HTMLElement;

  const sorted = new ManualMemo(() => {
    let items: InboxItem[] = [];

    for (const mentions of messageMentionStore.mentions.values()) {
      if (mentions.serverId) continue;
      if (inboxStore.inboxes.has(mentions.channelId)) continue;
      items.push({
        type: 0,
        channelId: mentions.channelId,
        user: mentions.mentionedBy,
        count: mentions.count,
      });
    }

    const inboxes = [...inboxStore.inboxes.values()]
      .map((item) => ({
        type: 1,
        channelId: item.channelId,
        inbox: item,
        channel: channelStore.channels.get(item.channelId)!,
        user: userStore.users.get(item.recipientId)!,
        count: messageMentionStore.mentions.get(item.channelId)?.count,
      }))
      .sort((a, b) => {
        const aHasCount = (a.count ?? 0) > 0 ? 1 : 0;
        const bHasCount = (b.count ?? 0) > 0 ? 1 : 0;
        if (bHasCount !== aHasCount) return bHasCount - aHasCount;
        const aTime =
          a.channel?.lastMessagedAt ??
          a.inbox.lastSeen ??
          a.inbox.createdAt ??
          0;
        const bTime =
          b.channel?.lastMessagedAt ??
          b.inbox.lastSeen ??
          b.inbox.createdAt ??
          0;
        return bTime - aTime;
      });

    return [...items, ...inboxes] as InboxItem[];
  });

  const rerender = (forceRerenderId?: string | boolean) => {
    reconcile({
      container: inboxListEl,
      values: sorted.value(),
      valueId: "channelId",
      dataAttr: "channel-id",
      create: InboxItem,
      shouldRecreate: (_, item) => {
        if (forceRerenderId === true) return true;
        return item.user.id === forceRerenderId;
      },
    });
  };
  rerender();

  const handlePresenceUpdate = (event: { userId: string }) => {
    const inboxEl = inboxListEl.querySelector(
      `[data-user-id="${event.userId}"]`,
    );
    if (!inboxEl) return;
    rerender(event.userId);
  };

  const handleMentionUpdate = (mention?: MessageMention) => {
    sorted.rerun();
    rerender(!mention ? true : mention.mentionedBy.id);
  };

  return {
    rerender,
    inboxListEl,
    sorted,
    handlePresenceUpdate,
    handleMentionUpdate,
  };
};

interface FriendItem {
  userId: string;
  friend: Friend;
  user: User;
  inbox?: Inbox;
  count?: number;
  createdAt: number;
}
const createFriendsList = () => {
  const requestsTitle = (<div class={style.friendsTitle}></div>) as HTMLElement;
  const onlineTitle = (<div class={style.friendsTitle}></div>) as HTMLElement;
  const offlineTitle = (<div class={style.friendsTitle}></div>) as HTMLElement;

  const requestsListEl = (<div></div>) as HTMLElement;
  const onlineListEl = (<div></div>) as HTMLElement;
  const offlineListEl = (<div></div>) as HTMLElement;
  const friendListEl = (
    <div class={style.inboxList}>
      {requestsTitle}
      {requestsListEl}
      {onlineTitle}
      {onlineListEl}
      {offlineTitle}
      {offlineListEl}
    </div>
  ) as HTMLElement;

  const sorted = new ManualMemo(() => {
    const userIdToInbox = new Map<string, Inbox>();

    for (const inbox of inboxStore.inboxes.values()) {
      userIdToInbox.set(inbox.recipientId, inbox);
    }
    const userIdToMentionCount = new Map<string, number>();

    for (const mention of messageMentionStore.mentions.values()) {
      userIdToMentionCount.set(mention.mentionedBy.id, mention.count ?? 0);
    }

    const sorted = [...friendStore.friends.values()]
      .map((friend) => ({
        friend,
        user: userStore.users.get(friend.recipientId),
      }))
      .sort((a, b) =>
        a.user!.username < b.user!.username
          ? -1
          : a.user!.username > b.user!.username
            ? 1
            : 0,
      )
      .map(({ friend, user }) => ({
        userId: friend.recipientId,
        friend,
        inbox: userIdToInbox.get(friend.recipientId)!,
        count: userIdToMentionCount.get(friend.recipientId),
        createdAt: friend.createdAt,
        user,
      }));

    return sorted as FriendItem[];
  });

  const categorizedFriends = new ManualMemo(() => {
    let requests: FriendItem[] = [];
    const online: FriendItem[] = [];
    const offline: FriendItem[] = [];
    const friends = sorted.value();

    for (let i = 0; i < friends.length; i++) {
      const friend = friends[i]!;
      const friendStatus = friend.friend.status;
      if ([FriendStatus.PENDING, FriendStatus.SENT].includes(friendStatus)) {
        requests.push(friend);
        continue;
      }
      if (friendStatus !== FriendStatus.FRIENDS) continue;
      const presence = userPresenceStore.presences.get(friend.userId);
      if (presence?.status) online.push(friend);
      else offline.push(friend);
    }

    requests = requests.sort((a, b) => a.createdAt - b.createdAt);

    return { online, offline, requests };
  });

  const rerender = (forceRerenderId?: string | boolean) => {
    const requests = categorizedFriends.value().requests;
    const online = categorizedFriends.value().online;
    const offline = categorizedFriends.value().offline;

    requestsTitle.classList.toggle(style.hide!, requests.length === 0);
    requestsTitle.textContent = t`Requests ~ ${ph({ count: requests.length })}`;

    onlineTitle.classList.toggle(style.hide!, online.length === 0);
    onlineTitle.textContent = t`Online ~ ${ph({ count: online.length })}`;

    offlineTitle.classList.toggle(style.hide!, offline.length === 0);
    offlineTitle.textContent = t`Offline ~ ${ph({ count: offline.length })}`;

    const reconciler = (container: HTMLElement, values: FriendItem[]) =>
      reconcile({
        container,
        values,
        valueId: "userId",
        dataAttr: "user-id",
        create: FriendItem,
        shouldRecreate: (_, item) => {
          if (forceRerenderId === true) return true;
          return item.userId === forceRerenderId;
        },
      });

    reconciler(requestsListEl, requests);
    reconciler(onlineListEl, online);
    reconciler(offlineListEl, offline);
  };
  rerender();

  const handlePresenceUpdate = (event: { userId: string }) => {
    const friendEl = friendListEl.querySelector(
      `[data-user-id="${event.userId}"]`,
    );
    if (!friendEl) return;
    categorizedFriends.rerun();
    rerender(event.userId);
  };

  const handleMentionUpdate = (mention?: MessageMention) => {
    sorted.rerun();
    categorizedFriends.rerun();
    rerender(!mention ? true : mention.mentionedBy.id);
  };

  return {
    rerender,
    inboxListEl: friendListEl,
    sorted,
    categorizedFriends,
    handlePresenceUpdate,
    handleMentionUpdate,
  };
};

const createInboxDrawer = () => {
  const abortController = new AbortController();
  const { signal } = abortController;
  let inboxList: ReturnType<typeof createInboxList> | null = createInboxList();
  let friendList: ReturnType<typeof createFriendsList> | null = null;

  let tabsEl = (<div class={style.tabs}></div>) as HTMLElement;

  const rerenderTabs = () => {
    const requestLength = [...friendStore.friends.values()].filter(
      (f) => f.status === FriendStatus.PENDING,
    ).length;

    let mentionCount = 0;
    [...messageMentionStore.mentions.values()].forEach((e) => {
      if (!e.serverId) mentionCount += e.count;
    });

    tabsEl.replaceChildren(
      <>
        <TabItem
          name={t`Inbox`}
          icon="inbox"
          selected={!!inboxList}
          count={mentionCount}
        />
        <TabItem
          name={t`Friends`}
          icon="diversity_1"
          selected={!!friendList}
          count={requestLength}
        />
      </>,
    );
  };
  rerenderTabs();

  let containerEl = (
    <div class={["scrollbarHover"]}>
      {tabsEl}

      {inboxList?.inboxListEl}
    </div>
  ) as HTMLElement;

  const onInboxTab = () => {
    if (inboxList) return;
    friendList?.inboxListEl.remove();
    friendList = null;

    inboxList = createInboxList();
    containerEl.appendChild(inboxList.inboxListEl);
  };
  const onFriendsTab = () => {
    if (friendList) return;

    inboxList?.inboxListEl.remove();
    inboxList = null;

    friendList = createFriendsList();
    containerEl.appendChild(friendList.inboxListEl);
  };

  const hoverAnimator = new HoverAnimator(containerEl, [
    {
      trigger: `.${style.inboxItem}`,
      image: ".avatar img",
    },
  ]);

  tabsEl.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement;
      const tabItemEl = target.closest(`.${style.tabItem}`);
      const elements = tabsEl.children;
      if (!tabItemEl) return;

      elements[0]?.setAttribute("data-selected", "false");
      elements[1]?.setAttribute("data-selected", "false");

      if (tabItemEl === elements[0]) {
        elements[0].setAttribute("data-selected", "true");
        onInboxTab();
      } else if (tabItemEl === elements[1]) {
        elements[1].setAttribute("data-selected", "true");
        onFriendsTab();
      }
    },
    { signal },
  );

  let dmOpening = false;
  const openChannel = async (userId: string) => {
    if (dmOpening) return;
    dmOpening = true;
    const inbox = await inboxStore.loadInbox(userId).finally(() => {
      dmOpening = false;
    });
    if (!inbox) return;
    router.navigate(`/app/inbox/${inbox.channelId}`);
  };

  containerEl.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement;
      const item = target.closest(`.${style.inboxItem}`) as HTMLElement;
      if (item) {
        const channelId = item.dataset.channelId;
        if (target.closest(`.${style.closeButton}`)) {
          e?.preventDefault();
          e?.stopPropagation();
          inboxStore.close(channelId!);
          return;
        }

        const actionEl = target.closest("[data-action]") as HTMLDivElement;
        const action = actionEl?.dataset.action as "req-cancel" | "req-accept";
        if (action) {
          const userId = item.dataset.userId;
          e?.preventDefault();
          e.stopPropagation();
          if (action === "req-accept") {
            acceptFriend({ userId: userId! });
          }
          if (action === "req-cancel") {
            removeFriend(userId!);
          }
          return;
        }

        Drawer().updatePage({ page: 1 });
        const channel = channelStore.channels.get(channelId!);
        if (channel) return;
        const userId = item.dataset.userId;
        if (!userId) return;
        openChannel(userId);
      }
    },
    { signal },
  );

  storeEmitter.on("friend:request", () => rerender(), signal);

  storeEmitter.on(
    "user:presence_update",
    (event) => {
      const list = friendList || inboxList;
      list?.handlePresenceUpdate(event);
    },
    signal,
  );
  storeEmitter.on(
    "ws:authStateUpdate",
    (state) => {
      if (!state) return;
      inboxList?.sorted.rerun();
      inboxList?.rerender();

      friendList?.sorted.rerun();
      friendList?.categorizedFriends.rerun();
      friendList?.rerender();
      rerenderTabs();
    },
    signal,
  );
  storeEmitter.on(
    "navigate:channelId",
    () => {
      updateSelectedItem(inboxList?.inboxListEl || friendList?.inboxListEl);
    },
    signal,
  );
  storeEmitter.on(
    "mention:dm_update",
    (mention) => {
      (inboxList || friendList)?.handleMentionUpdate(mention);
      rerenderTabs();
    },
    signal,
  );

  storeEmitter.on(
    "channel:notify_update",
    (event) => {
      if (event.serverId) return;
      (inboxList || friendList)?.handleMentionUpdate();
      rerenderTabs();
    },
    signal,
  );

  const rerender = (event?: { recipientId: string }) => {
    inboxList?.sorted.rerun();
    inboxList?.rerender();
    friendList?.sorted.rerun();
    friendList?.categorizedFriends.rerun();
    friendList?.rerender(event?.recipientId);
    rerenderTabs();
  };

  storeEmitter.on("inbox:open", rerender, signal);
  storeEmitter.on("inbox:close", rerender, signal);

  const render = () => {
    return containerEl;
  };

  const destroy = () => {
    abortController.abort();
    hoverAnimator.destroy();
    containerEl?.remove();
    inboxList?.inboxListEl.remove();
    friendList?.inboxListEl.remove();
    tabsEl?.remove();
    (containerEl as any) = null;
    (tabsEl as any) = null;
    inboxList = null;
    friendList = null;
  };

  return {
    destroy,
    render,
  };
};
export default createInboxDrawer;
