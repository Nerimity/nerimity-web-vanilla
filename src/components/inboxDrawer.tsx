import { css } from "@linaria/core";

import { h } from "../h";
import { channelStore } from "../store/channelStore";
import { Inbox, inboxStore } from "../store/inboxStore";
import { userStore } from "../store/userStore";
import { scoped } from "../utils/css";
import { storeEmitter } from "../utils/EventEmitter";
import { reconcile } from "../utils/html";
import { ManualMemo } from "../utils/memo";
import { Avatar } from "./avatar";
import { UserPresence } from "./userPresence";

const inboxList = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const inboxItem = css`
  display: flex;
  align-items: center;
  gap: 8px;
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
    <div class={inboxItem} data-inbox-id={item.id}>
      <Avatar user={user!} size={32} />
      <div class={scoped`info`}>
        <div>{user?.username}</div>
        <UserPresence userId={item.recipientId} />
      </div>
    </div>
  );
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
      dataAttr: "inbox-id",
      create: InboxItem,
    });
  };

  storeEmitter.on(
    "ws:authStateUpdate",
    (state) => {
      if (!state) return;
      sortedInboxes.rerun();
      rerender();
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
