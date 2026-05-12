import { css } from "@linaria/core";
import morphdom from "morphdom";

import { h } from "../../h";
import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { Message, messageStore } from "../../store/messageStore";
import { storeEmitter } from "../../utils/EventEmitter";
import { reconcile } from "../../utils/html";
import { MessageItem } from "./messageItem";
import { shouldGroup } from "./utils";

const messagePane = css`
  display: flex;
  flex-direction: column;
  gap: 4px;
  height: 100vh;
  overflow: auto;
  width: 100%;
`;
export const createMessagePane = () => {
  const el = (<div class={messagePane}></div>) as unknown as HTMLDivElement;

  const scrollToBottom = () => {
    el.scrollTop = el.scrollHeight;
  };
  const updateMessage = (message: Message, index: number) => {
    const messages = messageStore.messages.get(channelStore.currentChannelId!);
    const messageEl = el.querySelector(
      `[data-message-id="${message.id}"]`,
    ) as HTMLDivElement | null;
    if (!messageEl) return;
    morphdom(
      messageEl,
      (
        <MessageItem message={message} prevMessage={messages?.[index - 1]} />
      ) as unknown as HTMLElement,
    );
  };

  const rerender = async (loadFromCache?: boolean) => {
    const channelId = channelStore.currentChannelId;
    if (!channelId) return;
    const messages = loadFromCache
      ? messageStore.messages.get(channelId)
      : await messageStore.loadMessages(channelStore.currentChannelId!);
    if (!messages) return;
    if (channelId !== channelStore.currentChannelId) return;

    reconcile({
      container: el,
      dataAttr: "message-id",
      values: messages,
      valueId: "id",
      create: (m, i) => (
        <MessageItem message={m} prevMessage={messages[i - 1]} />
      ),
      shouldRecreate: (node, m, i) => {
        const prevGrouped = node.dataset.grouped === "true";
        const nextGrouped = shouldGroup(m, messages[i - 1]);
        return prevGrouped !== nextGrouped;
      },
    });

    scrollToBottom();
  };

  const channelIdUnsub = storeEmitter.on("navigate:channelId", () => {
    rerender();
  });

  const messageCreatedUnsub = storeEmitter.on("message:created", (message) => {
    if (message.channelId !== channelStore.currentChannelId) return;
    rerender(true);
  });
  const messageDeletedUnsub = storeEmitter.on("message:deleted", (event) => {
    if (event.channelId !== channelStore.currentChannelId) return;
    rerender(true);
  });
  const authUnsub = storeEmitter.on("user:authenticated", () => {
    messageStore
      .loadMessages(channelStore.currentChannelId!)
      .then(() => rerender());
  });

  const messageUpdatedUnsub = storeEmitter.on(
    "message:updated",
    ({ message, index }) => {
      if (message.channelId !== channelStore.currentChannelId) return;
      updateMessage(message, index);
    },
  );

  const render = () => {
    if (accountStore.authenticated) {
      messageStore
        .loadMessages(channelStore.currentChannelId!)
        .then(() => rerender());
    }
    return el;
  };

  const destroy = () => {
    authUnsub();
    channelIdUnsub();
    messageCreatedUnsub();
    messageDeletedUnsub();
    messageUpdatedUnsub();
    el.remove();
  };

  return { render, destroy };
};
