import { css } from "@linaria/core";
import morphdom from "morphdom";

import { h } from "../../h";
import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { Message, messageStore } from "../../store/messageStore";
import { storeEmitter } from "../../utils/EventEmitter";
import { FocusAnimator } from "../../utils/FocusAnimator";
import { HoverAnimator } from "../../utils/HoverAnimator";
import { reconcile } from "../../utils/html";
import { createChatbar } from "./chatbar";
import { createImageEmbedResizer } from "./imageEmbed";
import { MessageItem } from "./messageItem";
import { shouldGroup } from "./utils";

const messagePane = css`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  --padding-right: 0;
  --mobile-padding-right: 0;

  > .logs {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    flex: 1;
    padding-bottom: 16px;
  }
`;
export const createMessagePane = () => {
  const abortController = new AbortController();
  const { signal } = abortController;
  const chatbar = createChatbar();
  const logs = (
    <div class={["logs", "scrollbarHover"]}></div>
  ) as unknown as HTMLDivElement;
  const el = (
    <div class={messagePane}>
      {logs}
      {chatbar.render()}
    </div>
  ) as unknown as HTMLDivElement;

  const scrollToBottom = () => {
    logs.scrollTop = logs.scrollHeight;
  };
  const updateMessage = (message: Message, index: number) => {
    const messages = messageStore.messages.get(channelStore.currentChannelId!);
    const messageEl = logs.querySelector(
      `[data-message-id="${message.tempId || message.id}"]`,
    ) as HTMLDivElement | null;
    if (!messageEl) return;
    morphdom(
      messageEl,
      (
        <MessageItem
          container={logs}
          message={message}
          prevMessage={messages?.[index - 1]}
        />
      ) as unknown as HTMLElement,
    );
  };

  const rerender = async (loadFromCache?: boolean) => {
    const channelId = channelStore.currentChannelId;
    if (!channelId) return;
    if (!accountStore.authenticated) return;
    const messages = loadFromCache
      ? messageStore.messages.get(channelId)
      : await messageStore.loadMessages(channelStore.currentChannelId!);
    if (!messages) return;
    if (channelId !== channelStore.currentChannelId) return;

    reconcile({
      container: logs,
      dataAttr: "message-id",
      values: messages,
      valueId: "id",
      create: (m, i) => (
        <MessageItem
          message={m}
          prevMessage={messages[i - 1]}
          container={logs}
        />
      ),
      shouldRecreate: (node, m, i) => {
        const prevGrouped = node.dataset.grouped === "true";
        const nextGrouped = shouldGroup(m, messages[i - 1]);
        return prevGrouped !== nextGrouped;
      },
    });

    scrollToBottom();
  };

  const imageEmbedResizer = createImageEmbedResizer(logs);

  storeEmitter.on(
    "navigate:channelId",
    () => {
      logs.replaceChildren();
      rerender();
    },
    signal,
  );

  storeEmitter.on(
    "message:created",
    (message) => {
      if (message.channelId !== channelStore.currentChannelId) return;
      rerender(true);
    },
    signal,
  );
  storeEmitter.on(
    "message:deleted",
    (event) => {
      if (event.channelId !== channelStore.currentChannelId) return;
      rerender(true);
    },
    signal,
  );
  storeEmitter.on(
    "user:authenticated",
    () => {
      messageStore
        .loadMessages(channelStore.currentChannelId!)
        .then(() => rerender());
    },
    signal,
  );

  storeEmitter.on(
    "message:updated",
    ({ message, index }) => {
      if (message.channelId !== channelStore.currentChannelId) return;
      updateMessage(message, index);
    },
    signal,
  );

  const hoverAnimator = new HoverAnimator(logs, [
    { trigger: `.messageItem`, image: ".clanIcon img" },
    { trigger: `.messageItem`, image: ".avatar img" },
    { trigger: `.messageItem`, image: ".emoji" },
  ]);

  const imageEmbedFocus = new FocusAnimator(logs, ".imageEmbed .image");

  const render = () => {
    if (accountStore.authenticated) {
      messageStore
        .loadMessages(channelStore.currentChannelId!)
        .then(() => rerender());
    }
    return el;
  };

  const destroy = () => {
    abortController.abort();
    imageEmbedResizer.destroy();
    imageEmbedFocus.destroy();
    hoverAnimator.destroy();

    chatbar.destroy();
    el.remove();
    logs.remove();
  };

  return { render, destroy };
};
