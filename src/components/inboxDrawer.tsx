import { css } from "@linaria/core";
import { t } from "@lingui/core/macro";

import { h } from "../h";
import { channelStore } from "../store/channelStore";
import { Inbox, inboxStore } from "../store/inboxStore";
import { userStore } from "../store/userStore";
import { scoped } from "../utils/css";
import { storeEmitter } from "../utils/EventEmitter";
import { reconcile } from "../utils/html";
import { ManualMemo } from "../utils/memo";
import { Avatar } from "./avatar";
import { Drawer } from "./drawer";
import { Icon } from "./icon";
import { Item } from "./item";
import { UserPresence } from "./userPresence";

const inboxList = css`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-left: 4px;
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

const InboxItem = (item: Inbox) => {
  const user = userStore.users.get(item.recipientId);
  return (
    <Item.Base
      selected={channelStore.currentChannelId === item.channelId}
      href={`/app/inbox/${item.channelId}`}
      class={inboxItem}
      data-channel-id={item.channelId}
    >
      <Avatar user={user!} size={28} />
      <div class={scoped`info`}>
        <div>{user?.username}</div>
        <UserPresence userId={item.recipientId} />
      </div>
    </Item.Base>
  );
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

  const rerender = () => {
    // inboxTitle.querySelector(".count")!.textContent =
    //   inboxStore.inboxes.size.toLocaleString();
    reconcile({
      container: inboxListEl,
      values: sorted.value(),
      valueId: "id",
      dataAttr: "channel-id",
      create: InboxItem,
    });
  };
  rerender();

  return {
    rerender,
    inboxListEl,
    sorted,
  };
};

export const createInboxDrawer = () => {
  const abortController = new AbortController();
  const { signal } = abortController;
  let inboxList: ReturnType<typeof createInboxList> | null = createInboxList();

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
    inboxList = createInboxList();
    containerEl.appendChild(inboxList.inboxListEl);
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
        inboxList?.inboxListEl.remove();
        inboxList = null;
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
    "ws:authStateUpdate",
    (state) => {
      if (!state) return;
      inboxList?.sorted.rerun();
      inboxList?.rerender();
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
