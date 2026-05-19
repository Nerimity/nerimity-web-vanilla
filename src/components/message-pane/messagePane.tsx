import { css } from "@linaria/core";
import morphdom from "morphdom";

import { h } from "../../h";
import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { Message, messageStore } from "../../store/messageStore";
import { serverStore } from "../../store/serverStore";
import { storeEmitter } from "../../utils/EventEmitter";
import { FocusAnimator } from "../../utils/FocusAnimator";
import { HoverAnimator } from "../../utils/HoverAnimator";
import { reconcile } from "../../utils/html";
import { createIntersectionObserver } from "../../utils/observer";
import { Drawer } from "../drawer";
import { MessageSkeleton } from "../skeleton";
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
  padding-top: 56px;
  padding-bottom: 74px;

  > .logs {
    display: flex;
    flex-direction: column;
    width: 100%;
    flex: 1;
  }
  .hide {
    display: none;
  }
`;
export const createMessagePane = () => {
  const abortController = new AbortController();
  const { signal } = abortController;
  const chatbar = createChatbar();
  const logs = (<div class="logs"></div>) as unknown as HTMLDivElement;

  const shouldShowBottomSkel = () => {
    const channelId = channelStore.currentChannelId;
    if (!channelId) return false;
    const properties = channelStore.getProperty(channelId);
    const messages = messageStore.messages.get(channelId);

    return properties!.canLoadBottom || !messages;
  };
  const shouldShowTopSkel = () => {
    const channelId = channelStore.currentChannelId;
    if (!channelId) return false;
    const properties = channelStore.getProperty(channelId);

    return properties!.canLoadTop;
  };

  const skeletonsTop = (
    <div class={[shouldShowTopSkel() ? "" : "hide"]}>
      {Array.from({ length: 26 }, () => (
        <MessageSkeleton />
      ))}
    </div>
  ) as HTMLDivElement;

  const skeletonsBottom = (
    <div class={[shouldShowBottomSkel() ? "" : "hide"]}>
      {Array.from({ length: 26 }, () => (
        <MessageSkeleton />
      ))}
    </div>
  ) as HTMLDivElement;

  const el = (
    <div class={[messagePane, "scrollbarHover"]}>
      {skeletonsTop}
      {logs}
      {skeletonsBottom}
      {chatbar.render()}
    </div>
  ) as HTMLDivElement;

  const onTopSkeletonIntersect = async () => {
    const channelId = channelStore.currentChannelId;
    if (!channelId) return;
    const properties = channelStore.getProperty(channelId);
    if (properties!.loading) return;

    const messages = messageStore.messages.get(channelId);
    const firstMessageId = messages?.[0]?.id;
    if (!firstMessageId) return;

    const anchorEl = logs.querySelector(
      `[data-message-id="${firstMessageId}"]`,
    ) as HTMLDivElement | null;
    const anchorOffsetTop = anchorEl?.offsetTop ?? 0;

    channelStore.setProperty(channelId, { loading: true });
    const newMessages = await messageStore.loadMessages(channelId, {
      before: firstMessageId,
    });
    if (!newMessages) {
      channelStore.setProperty(channelId, { loading: false });
      return;
    }
    const canLoadTop = newMessages?.length === 50;
    channelStore.setProperty(channelId, {
      canLoadTop,
      canLoadBottom: true,
      loading: false,
    });

    rerender({ dontScrollDown: true });
    const newAnchorOffsetTop = anchorEl?.offsetTop ?? 0;
    el.scrollTop += newAnchorOffsetTop - anchorOffsetTop;
  };

  const onBottomSkeletonIntersect = async (loadNew?: boolean) => {
    const channelId = channelStore.currentChannelId;
    if (!channelId) return;
    const properties = channelStore.getProperty(channelId)!;
    if (properties.loading) return;

    const messages = messageStore.messages.get(channelId);
    // if there are no messages, load them.
    if (loadNew) {
      if (messages) {
        rerender();
        return;
      }
      if (!accountStore.authenticated) return;
      channelStore.setProperty(channelId, { loading: true });
      const newMessages = await messageStore.loadMessages(channelId);
      if (!newMessages) {
        channelStore.setProperty(channelId, { loading: false });
        return;
      }
      const canLoadTop = newMessages?.length === 50;
      channelStore.setProperty(channelId, {
        loading: false,
        canLoadTop,
        canLoadBottom: false,
      });
      rerender();
      scrollToBottom(true);
      return;
    }
    if (!messages) return;
    const lastMessageId = messages[messages.length - 1]?.id;
    if (!lastMessageId) return;

    const newMessages = await messageStore.loadMessages(channelId, {
      after: lastMessageId,
    });
    if (!newMessages) {
      channelStore.setProperty(channelId, { loading: false });
      return;
    }

    const canLoadBottom = newMessages?.length === 50;
    channelStore.setProperty(channelId, {
      canLoadTop: true,
      canLoadBottom,
      loading: false,
    });

    rerender({ dontScrollDown: true });
  };

  createIntersectionObserver(
    skeletonsBottom,
    el,
    onBottomSkeletonIntersect,
    signal,
  );
  createIntersectionObserver(skeletonsTop, el, onTopSkeletonIntersect, signal);

  const isScrolledToBottom = () => {
    const threshold = 50;
    return el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
  };

  const scrollToBottom = (force?: boolean) => {
    if (!force && !isScrolledToBottom()) return;
    // when drawer is  currently being dragged, dont reset the position.
    Drawer().setIgnoreNextScroll();
    el.scrollTop = el.scrollHeight;
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
          container={el}
          message={message}
          prevMessage={messages?.[index - 1]}
        />
      ) as unknown as HTMLElement,
    );
  };

  const rerender = async (opts?: {
    forceRecreate?: boolean;
    dontScrollDown?: boolean;
  }) => {
    skeletonsBottom.classList.toggle("hide", !shouldShowBottomSkel());

    const channelId = channelStore.currentChannelId;
    if (!channelId) return;
    if (!accountStore.authenticated) return;
    const messages = messageStore.messages.get(channelId);
    if (!messages) return;
    if (channelId !== channelStore.currentChannelId) return;

    reconcile({
      container: logs,
      dataAttr: "message-id",
      values: messages,
      valueId: "id",
      create: (m, i) => (
        <MessageItem message={m} prevMessage={messages[i - 1]} container={el} />
      ),
      shouldRecreate: (node, m, i) => {
        if (opts?.forceRecreate) return true;
        const prevGrouped = node.dataset.grouped === "true";
        const nextGrouped = shouldGroup(m, messages[i - 1]);
        return prevGrouped !== nextGrouped;
      },
    });

    const property = channelStore.getProperty(channelId);
    const savedScrollTop = property?.scrollTop;
    skeletonsTop.classList.toggle("hide", !shouldShowTopSkel());
    if (!opts?.dontScrollDown) {
      if (savedScrollTop !== undefined) {
        el.scrollTop = savedScrollTop;
      } else if (!opts?.dontScrollDown) {
        scrollToBottom();
      }
    }
  };

  const imageEmbedResizer = createImageEmbedResizer(el);

  let previousChannelId = channelStore.currentChannelId;

  storeEmitter.on(
    "navigate:channelId",
    () => {
      const scrolledToBottom = isScrolledToBottom();
      const scrollTop = el.scrollTop;

      if (previousChannelId) {
        channelStore.setProperty(previousChannelId, {
          scrollTop: scrolledToBottom ? undefined : scrollTop,
        });
      }

      previousChannelId = channelStore.currentChannelId;
      logs.replaceChildren();
      scrollToBottom(true);
      onBottomSkeletonIntersect(true);
    },
    signal,
  );

  storeEmitter.on(
    "server:members_fetched",
    ({ serverId }) => {
      if (serverId !== serverStore.currentServerId) return;
      rerender({ forceRecreate: true });
    },
    signal,
  );

  storeEmitter.on(
    "message:created",
    (message) => {
      if (message.channelId !== channelStore.currentChannelId) return;
      rerender();
    },
    signal,
  );
  storeEmitter.on(
    "message:deleted",
    (event) => {
      if (event.channelId !== channelStore.currentChannelId) return;
      rerender();
    },
    signal,
  );
  storeEmitter.on(
    "ws:authStateUpdate",
    (state) => {
      if (!state) return;
      onBottomSkeletonIntersect(true);
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
