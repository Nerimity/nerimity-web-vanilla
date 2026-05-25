import { css } from "@linaria/core";
import { t } from "@lingui/core/macro";

import { h } from "../h";
import { channelStore } from "../store/channelStore";
import { Friend, friendStore } from "../store/friendStore";
import { Inbox, inboxStore } from "../store/inboxStore";
import { userPresenceStore } from "../store/userPresenceStore";
import { User, userStore } from "../store/userStore";
import { scoped } from "../utils/css";
import { storeEmitter } from "../utils/EventEmitter";
import { reconcile } from "../utils/html";
import { ManualMemo } from "../utils/memo";
import { Avatar } from "./avatar";
import { Drawer } from "./drawer";
import { Icon } from "./icon";
import { Item } from "./item";
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
    }
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

const UserItem = (props: { inbox?: Inbox; user: User }) => {
  const channelId = props.inbox?.channelId;
  return (
    <Item.Base
      selected={channelStore.currentChannelId === channelId}
      href={channelId && `/app/inbox/${channelId}`}
      class={inboxItem}
      data-channel-id={channelId}
      data-user-id={props.user.id}
    >
      <Avatar user={props.user} size={28} />
      <div class={scoped`info`}>
        <div>{props.user?.username}</div>
        <UserPresenceItem userId={props.user.id} />
      </div>
    </Item.Base>
  );
};

const FriendItem = (item: Friend) => {
  const user = userStore.users.get(item.recipientId);
  return <UserItem user={user!} />;
};
const InboxItem = (item: Inbox) => {
  const user = userStore.users.get(item.recipientId);
  return <UserItem inbox={item} user={user!} />;
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

const createInboxList = () => {
  const inboxListEl = (<div class={inboxList}></div>) as HTMLElement;

  const sorted = new ManualMemo(() => {
    return [...inboxStore.inboxes.values()].sort((a, b) => {
      const aChannel = channelStore.channels.get(a.channelId);
      const bChannel = channelStore.channels.get(b.channelId);
      const aTime = aChannel?.lastMessagedAt ?? a?.createdAt ?? 0;
      const bTime = bChannel?.lastMessagedAt ?? b?.createdAt ?? 0;
      return bTime - aTime;
    });
  });

  const rerender = (forceRerenderId?: string) => {
    reconcile({
      container: inboxListEl,
      values: sorted.value(),
      valueId: "channelId",
      dataAttr: "channel-id",
      create: InboxItem,
      shouldRecreate: (_, item) => item.recipientId === forceRerenderId,
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

  return {
    rerender,
    inboxListEl,
    sorted,
    handlePresenceUpdate,
  };
};

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
    return [...friendStore.friends.values()].sort((a, b) => {
      const usernameA = userStore.users.get(a.recipientId)?.username ?? "";
      const usernameB = userStore.users.get(b.recipientId)?.username ?? "";
      return usernameA.localeCompare(usernameB);
    });
  });

  const categorizedFriends = new ManualMemo(() => {
    const online: Friend[] = [];
    const offline: Friend[] = [];
    const friends = sorted.value();

    for (let i = 0; i < friends.length; i++) {
      const friend = friends[i]!;
      const presence = userPresenceStore.presences.get(friend.recipientId);
      if (presence?.status) online.push(friend);
      else offline.push(friend);
    }

    return { online, offline };
  });

  const rerender = (forceRerenderId?: string) => {
    const online = categorizedFriends.value().online;
    const offline = categorizedFriends.value().offline;
    onlineTitle.classList.toggle("hide", online.length === 0);
    offlineTitle.classList.toggle("hide", offline.length === 0);
    onlineTitle.textContent = t`Online - ${online.length}`;
    offlineTitle.textContent = t`Offline - ${offline.length}`;
    reconcile({
      container: onlineListEl,
      values: online,
      valueId: "recipientId",
      dataAttr: "user-id",
      create: FriendItem,
      shouldRecreate: (_, item) => item.recipientId === forceRerenderId,
    });
    reconcile({
      container: offlineListEl,
      values: offline,
      valueId: "recipientId",
      dataAttr: "user-id",
      create: FriendItem,
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

  return {
    rerender,
    inboxListEl: friendListEl,
    sorted,
    categorizedFriends,
    handlePresenceUpdate,
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

  containerEl.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement;
      if (target.closest(`.${inboxItem}`)) {
        Drawer().updatePage({ page: 1 });
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
      updateSelectedItem(inboxList?.inboxListEl);
    },
    signal,
  );

  const render = () => {
    return containerEl;
  };

  const destroy = () => {
    abortController.abort();
    containerEl?.remove();
  };

  return {
    destroy,
    render,
  };
};
export default createInboxDrawer;
