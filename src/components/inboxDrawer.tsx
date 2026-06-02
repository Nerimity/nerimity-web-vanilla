import { css } from "@linaria/core";
import { t } from "@lingui/core/macro";

import { h } from "../h";
import { Channel, channelStore } from "../store/channelStore";
import { Friend, friendStore } from "../store/friendStore";
import { Inbox, inboxStore } from "../store/inboxStore";
import {
  MessageMention,
  messageMentionStore,
} from "../store/messageMentionStore";
import { userPresenceStore } from "../store/userPresenceStore";
import { User, userStore } from "../store/userStore";
import { scoped } from "../utils/css";
import { storeEmitter } from "../utils/EventEmitter";
import { HoverAnimator } from "../utils/HoverAnimator";
import { reconcile } from "../utils/html";
import { ManualMemo } from "../utils/memo";
import { router } from "../utils/router";
import { Avatar } from "./avatar";
import { Drawer } from "./drawer";
import { Icon } from "./icon";
import { Item } from "./item";
import { NotificationPill } from "./NotificationPill";
import { UserPresence as UserPresenceItem } from "./userPresence";

const inboxList = css`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-left: 4px;
  .friendsTitle {
    margin-left: 8px;
    color: var(--text-muted);
    font-size: 14px;
    &.hide {
      display: none;
    }
  }
`;

const tabs = css`
  display: flex;
  gap: 4px;
  margin: 8px 4px;
  margin-left: 8px;
  margin-bottom: 12px;
`;

const inboxItem = css`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding-left: 12px;
  padding-right: 8px;
  border-radius: var(--radius-8);
  .${scoped`info`} {
    display: flex;
    flex-direction: column;
    font-size: 14px;
    overflow: hidden;
    > div {
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      line-height: 1.25;
    }
  }
  .pill {
    margin-left: auto;
  }
`;

const tabItem = css`
  display: flex;
  flex: 1;
  text-align: center;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--gray-300);
  font-size: 14px;
  background: var(--gray-900);
  border: solid 1px var(--gray-700);
  border-radius: var(--radius-max);
  padding: 6px 8px;
  cursor: pointer;
  transition: 0.1s;
  .icon {
    font-size: 16px;
  }
  &:hover {
    background: var(--gray-800);
    border-color: var(--gray-600);
    color: white;
  }
  &[data-selected="true"] {
    background: var(--primary-dark);
    color: white;
    border-color: var(--primary-color);
  }
`;

const TabItem = (props: { name: string; icon: string; selected?: boolean }) => {
  return (
    <button class={tabItem} data-selected={props.selected}>
      <Icon class="icon" name={props.icon} />
      <span class="name">{props.name}</span>
    </button>
  );
};

const UserItem = (props: {
  inbox?: InboxItem;
  user: User;
  friendItem?: FriendItem;
}) => {
  const channelId =
    props.friendItem?.inbox?.channelId ||
    (props.inbox?.type === 1 ? props.inbox?.channelId : undefined);

  const count = props.inbox?.count ?? props.friendItem?.count;

  return (
    <Item.Base
      selected={channelStore.currentChannelId === channelId}
      href={channelId && `/app/inbox/${channelId}`}
      class={inboxItem}
      data-channel-id={channelId || props.inbox?.channelId}
      data-user-id={props.user.id}
      alert={!!count}
    >
      <Avatar user={props.user} size={28} />
      <div class={scoped`info`}>
        <div class={scoped`username`}>{props.user?.username}</div>
        <UserPresenceItem userId={props.user.id} />
      </div>
      {count && <NotificationPill class="pill" count={count} />}
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
      user: User;
      count?: number;
    }
  | {
      type: 1;
      channelId: string;
      channel: Channel;
      inbox: Inbox;
      user: User;
      count?: number;
    };
const createInboxList = () => {
  const inboxListEl = (<div class={inboxList}></div>) as HTMLElement;

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
}
const createFriendsList = () => {
  const onlineTitle = (<div class="friendsTitle"></div>) as HTMLElement;
  const offlineTitle = (<div class="friendsTitle"></div>) as HTMLElement;

  const onlineListEl = (<div></div>) as HTMLElement;
  const offlineListEl = (<div></div>) as HTMLElement;
  const friendListEl = (
    <div class={inboxList}>
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
        user,
      }));

    return sorted as FriendItem[];
  });

  const categorizedFriends = new ManualMemo(() => {
    const online: FriendItem[] = [];
    const offline: FriendItem[] = [];
    const friends = sorted.value();

    for (let i = 0; i < friends.length; i++) {
      const friend = friends[i]!;
      const presence = userPresenceStore.presences.get(friend.userId);
      if (presence?.status) online.push(friend);
      else offline.push(friend);
    }

    return { online, offline };
  });

  const rerender = (forceRerenderId?: string | boolean) => {
    const online = categorizedFriends.value().online;
    const offline = categorizedFriends.value().offline;
    onlineTitle.classList.toggle("hide", online.length === 0);
    offlineTitle.classList.toggle("hide", offline.length === 0);
    onlineTitle.textContent = t`Online - ${online.length}`;
    offlineTitle.textContent = t`Offline - ${offline.length}`;
    reconcile({
      container: onlineListEl,
      values: online,
      valueId: "userId",
      dataAttr: "user-id",
      create: FriendItem,
      shouldRecreate: (_, item) => {
        if (forceRerenderId === true) return true;
        return item.userId === forceRerenderId;
      },
    });
    reconcile({
      container: offlineListEl,
      values: offline,
      valueId: "userId",
      dataAttr: "user-id",
      create: FriendItem,
      shouldRecreate: (_, item) => {
        if (forceRerenderId === true) return true;
        return item.userId === forceRerenderId;
      },
    });
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

  const tabsEl = (
    <div class={tabs}>
      <TabItem name={t`Inbox`} icon="inbox" selected />
      <TabItem name={t`Friends`} icon="diversity_1" />
    </div>
  ) as HTMLElement;

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
      trigger: `.${inboxItem}`,
      image: ".avatar img",
    },
  ]);

  tabsEl.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement;
      const tabItemEl = target.closest(`.${tabItem}`);
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
      const item = target.closest(`.${inboxItem}`) as HTMLElement;
      if (item) {
        Drawer().updatePage({ page: 1 });
        const channelId = item.dataset.channelId;
        const channel = channelStore.channels.get(channelId!);
        if (channel) return;
        const userId = item.dataset.userId;
        if (!userId) return;
        openChannel(userId);
      }
    },
    { signal },
  );

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
    },
    signal,
  );

  storeEmitter.on(
    "channel:notify_update",
    (event) => {
      if (event.serverId) return;
      (inboxList || friendList)?.handleMentionUpdate();
    },
    signal,
  );

  storeEmitter.on(
    "inbox:open",
    (event) => {
      inboxList?.sorted.rerun();
      inboxList?.rerender();
      friendList?.sorted.rerun();
      friendList?.categorizedFriends.rerun();
      friendList?.rerender(event.recipientId);
    },
    signal,
  );

  const render = () => {
    return containerEl;
  };

  const destroy = () => {
    abortController.abort();
    hoverAnimator.destroy();
    containerEl?.remove();
  };

  return {
    destroy,
    render,
  };
};
export default createInboxDrawer;
