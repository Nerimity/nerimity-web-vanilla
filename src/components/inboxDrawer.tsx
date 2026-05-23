import { css } from "@linaria/core";

import { h, Fragment } from "../h";
import { channelStore } from "../store/channelStore";
import { Inbox, inboxStore } from "../store/inboxStore";
import { userStore } from "../store/userStore";
import { scoped } from "../utils/css";
import { storeEmitter } from "../utils/EventEmitter";
import { reconcile } from "../utils/html";
import { ManualMemo } from "../utils/memo";
import { Avatar } from "./avatar";
import { Drawer } from "./drawer";
import { Item } from "./item";
import { UserPresence } from "./userPresence";

const inboxList = css`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-left: 4px;
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

const updateSelected = (container: HTMLElement) => {
  const channelId = channelStore.currentChannelId;
  const oldSelected = container.querySelector(`[data-selected="true"]`);
  oldSelected?.removeAttribute("data-selected");
  if (!channelId) return;
  const newSelected = container.querySelector(
    `[data-channel-id="${channelId}"]`,
  );
  if (newSelected) newSelected.setAttribute("data-selected", "true");
};

export const createInboxDrawer = () => {
  const abortController = new AbortController();
  const { signal } = abortController;
  const inboxListEl = (<div class={inboxList}></div>) as HTMLElement;
  let containerEl = (
    <div class={["scrollbarHover"]}>{inboxListEl}</div>
  ) as HTMLElement;

  const sortedInboxes = new ManualMemo(() => {
    return [...inboxStore.inboxes.values()].sort((a, b) => {
      const aChannel = channelStore.channels.get(a.channelId);
      const bChannel = channelStore.channels.get(b.channelId);
      const aTime = aChannel?.lastMessagedAt ?? a?.createdAt ?? 0;
      const bTime = bChannel?.lastMessagedAt ?? b?.createdAt ?? 0;
      return bTime - aTime;
    });
  });

  const rerender = () => {
    reconcile({
      container: inboxListEl,
      values: sortedInboxes.value(),
      valueId: "id",
      dataAttr: "channel-id",
      create: InboxItem,
    });
  };

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
      sortedInboxes.rerun();
      rerender();
    },
    signal,
  );
  storeEmitter.on(
    "navigate:channelId",
    () => {
      updateSelected(inboxListEl);
    },
    signal,
  );

  const render = () => {
    rerender();

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
