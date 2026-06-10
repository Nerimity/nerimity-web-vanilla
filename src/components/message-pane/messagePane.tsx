import { css } from "@linaria/core";
import morphdom from "morphdom";

import { h } from "../../h";
import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { Message, messageStore } from "../../store/messageStore";
import { serverStore } from "../../store/serverStore";
import { scoped } from "../../utils/css";
import { storeEmitter } from "../../utils/EventEmitter";
import { FocusAnimator } from "../../utils/FocusAnimator";
import { HoverAnimator } from "../../utils/HoverAnimator";
import { reconcile } from "../../utils/html";
import {
  createIntersectionObserver,
  createResizeObserver,
} from "../../utils/observer";
import { setRecentServerChannel } from "../../utils/recentServerChannels";
import { Drawer } from "../drawer";
import { MessageSkeleton } from "../skeleton";
import { createChatbar } from "./chatbar";
import { createInfiniteScroll } from "./createInfiniteScroll";
import { createImageEmbedResizer } from "./imageEmbed";
import { createMessageHoverActions } from "./messageHoverActions";
import { createMessageReactionHandler, MessageItem } from "./messageItem";
import { getLastSeenMessage, shouldGroup } from "./utils";

const messagePane = css`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  --padding-right: 0;
  --mobile-padding-right: 0;
  padding-top: 56px;
  position: relative;

  .${scoped`logs`} {
    display: flex;
    flex-direction: column;
    width: 100%;
    flex: 1;
  }
  .${scoped`bottomSentinel`} {
    height: 1px;
    flex-shrink: 0;
  }
  .${scoped`hide`} {
    display: none;
  }
`;

const SCROLLED_BOTTOM_THRESHOLD = 50;

const createMessagePane = () => {
  const abortController = new AbortController();
  const { signal } = abortController;
  const chatbar = createChatbar();
  const logs = (<div class={scoped`logs`}></div>) as unknown as HTMLDivElement;

  const getChannelProperty = () => {
    return channelStore.currentChannelProperty();
  };

  const shouldShowBottomSkel = () => {
    const property = getChannelProperty();
    if (!property) return false;
    const messages = messageStore.messages.get(channelStore.currentChannelId!);
    return property.canLoadBottom || !messages;
  };

  const shouldShowTopSkel = () => {
    const property = getChannelProperty();
    if (!property) return false;
    return property.canLoadTop;
  };

  const skeletonsTop = (
    <div class={[shouldShowTopSkel() ? "" : scoped`hide`]}>
      {Array.from({ length: 26 }, () => (
        <MessageSkeleton />
      ))}
    </div>
  ) as HTMLDivElement;

  const skeletonsBottom = (
    <div class={[shouldShowBottomSkel() ? "" : scoped`hide`]}>
      {Array.from({ length: 26 }, () => (
        <MessageSkeleton />
      ))}
    </div>
  ) as HTMLDivElement;

  const bottomSentinel = (
    <div class={scoped`bottomSentinel`} />
  ) as HTMLDivElement;

  const chatbarEl = chatbar.render();

  const el = (
    <div class={[messagePane, "scrollbarHover"]}>
      {skeletonsTop}
      {logs}
      {skeletonsBottom}
      {bottomSentinel}
      {chatbarEl}
    </div>
  ) as HTMLDivElement;
  const hoverActions = createMessageHoverActions({ container: el, signal });

  el.appendChild(hoverActions.hoverActionEl);

  let isScrolledToBottom = false;

  const updateScrolledToBottom = () => {
    const prev = isScrolledToBottom;
    isScrolledToBottom =
      el.scrollTop + el.clientHeight >=
      el.scrollHeight - SCROLLED_BOTTOM_THRESHOLD;
    if (prev !== isScrolledToBottom) {
      storeEmitter.emit("channel:scrolledToBottom", isScrolledToBottom);
    }
  };

  el.addEventListener("scroll", updateScrolledToBottom, {
    passive: true,
    signal,
  });

  const scrollToBottom = (force?: boolean) => {
    if (!force && !isScrolledToBottom) return;
    // when drawer is  currently being dragged, don't reset the position.
    requestAnimationFrame(() => {
      Drawer().setIgnoreNextScroll();
      el.scrollTop = el.scrollHeight;
    });
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

  type RerenderOpts = {
    forceRecreate?: boolean;
    preventScrollDown?: boolean;
    useSavedTop?: boolean;
    forceScrollDown?: boolean;
    removeLastSeenMarker?: boolean;
    updateLastSeenMarker?: boolean;
  };

  const restoreScrollPosition = (opts?: RerenderOpts) => {
    if (opts?.preventScrollDown) return;
    const property = getChannelProperty();
    const savedScrollTop = property?.scrollTop;
    if (opts?.useSavedTop && savedScrollTop !== undefined) {
      requestAnimationFrame(() => {
        el.scrollTop = savedScrollTop;
      });
    } else {
      scrollToBottom(opts?.forceScrollDown);
    }
  };

  let lastSeenMessage: Message | null = null;

  const rerender = async (opts?: RerenderOpts) => {
    skeletonsBottom.classList.toggle(scoped`hide`, !shouldShowBottomSkel());

    const channelId = channelStore.currentChannelId;
    if (!channelId) return;
    if (!accountStore.authenticated) return;
    const messages = messageStore.messages.get(channelId);
    if (!messages) return;

    const lastLastSeenMessage = lastSeenMessage;
    let markerChanged = false;

    if (
      lastSeenMessage === null ||
      opts?.updateLastSeenMarker ||
      opts?.removeLastSeenMarker
    ) {
      lastSeenMessage = opts?.removeLastSeenMarker
        ? null
        : getLastSeenMessage(channelId, messages);

      markerChanged = lastSeenMessage !== lastLastSeenMessage;
    }

    reconcile({
      container: logs,
      dataAttr: "message-id",
      values: messages,
      valueId: "id",
      create: (m, i) => (
        <MessageItem
          newMarker={m.id === lastSeenMessage?.id}
          message={m}
          prevMessage={messages[i - 1]}
          container={el}
        />
      ),
      shouldRecreate: (node, m, i) => {
        if (opts?.forceRecreate) return true;
        if (markerChanged && m.id === lastSeenMessage?.id) return true;
        if (lastLastSeenMessage && m.id === lastLastSeenMessage?.id)
          return true;
        const prevGrouped = node.dataset.grouped === "true";
        const nextGrouped = shouldGroup(m, messages[i - 1]);
        return prevGrouped !== nextGrouped;
      },
    });

    skeletonsTop.classList.toggle(scoped`hide`, !shouldShowTopSkel());
    updateScrolledToBottom();
    restoreScrollPosition(opts);
    requestAnimationFrame(() => {
      dismissNotification();
    });
  };
  const { onBottomSkeletonIntersect } = createInfiniteScroll({
    el,
    logs,
    skeletonsTop,
    skeletonsBottom,
    signal,
    rerender,
    scrollToBottom,
    shouldShowBottomSkel,
  });

  const imageEmbedResizer = createImageEmbedResizer(el);

  let previousChannelId = channelStore.currentChannelId;

  storeEmitter.on(
    "server:update_role",
    (event) => {
      if (event.serverId !== serverStore.currentServerId) return;
      rerender({ forceRecreate: true });
    },
    signal,
  );

  storeEmitter.on(
    "server:member_update",
    (event) => {
      if (!event.isMe) return;
      rerender({ forceRecreate: true });
    },
    signal,
  );

  storeEmitter.on(
    "navigate:channelId",
    () => {
      if (serverStore.currentServerId && channelStore.currentChannelId) {
        setRecentServerChannel(
          serverStore.currentServerId,
          channelStore.currentChannelId,
        );
      }

      lastSeenMessage = null;
      const scrolledToBottom = isScrolledToBottom;
      const scrollTop = el.scrollTop;

      if (previousChannelId) {
        channelStore.setProperty(previousChannelId, {
          scrollTop: scrolledToBottom ? undefined : scrollTop,
        });
      }

      previousChannelId = channelStore.currentChannelId;

      logs.replaceChildren();
      skeletonsBottom.classList.toggle(scoped`hide`, !shouldShowBottomSkel());
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

  const isFocusedAtBottom = () => document.hasFocus() && isScrolledToBottom;

  const dismissNotification = () => {
    const messages = messageStore.messages.get(channelStore.currentChannelId!);

    if (!messages) return;
    if (!isFocusedAtBottom()) return;
    if (getChannelProperty()?.canLoadBottom) return;

    channelStore.dismissNotification(channelStore.currentChannelId!);
  };

  createIntersectionObserver(bottomSentinel, el, dismissNotification, {
    signal,
    rootMargin: "0px 0px -50px 0px",
  });

  const checkAndScrollBottom = () => {
    const property = getChannelProperty();
    if (property?.scrollTop === undefined) scrollToBottom();
  };

  createResizeObserver(logs, checkAndScrollBottom, { signal });
  createResizeObserver(chatbarEl, checkAndScrollBottom, { signal });
  window.addEventListener("focus", dismissNotification, { signal });
  window.addEventListener("resize", () => scrollToBottom(), {
    signal,
    passive: true,
  });

  storeEmitter.on(
    "message:created",
    (message) => {
      if (message.channelId !== channelStore.currentChannelId) return;

      const createdByMe = message.createdBy.id === accountStore.currentUser?.id;

      rerender({
        forceScrollDown: isScrolledToBottom,
        removeLastSeenMarker: createdByMe || isFocusedAtBottom(),
        updateLastSeenMarker: true,
      });
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
  storeEmitter.on(
    "message_property:replying",
    (event) => {
      const messageItems = logs.querySelectorAll(`.messageItem`);
      const ids = event.replies.map((m) => m.id);
      for (const item of messageItems) {
        const messageEl = item as HTMLDivElement;
        const messageElParent = item.parentElement as HTMLDivElement;
        messageEl.classList.toggle(
          "editing",
          ids.includes(messageElParent.dataset.messageId!),
        );
      }
    },
    signal,
  );
  storeEmitter.on(
    "message_property:editing",
    (event) => {
      const messageItems = logs.querySelectorAll(`.messageItem`);
      for (const item of messageItems) {
        const messageEl = item as HTMLDivElement;
        const messageElParent = item.parentElement as HTMLDivElement;
        messageEl.classList.toggle(
          "editing",
          event.message?.id === messageElParent.dataset.messageId,
        );
      }
    },
    signal,
  );

  const hoverAnimator = new HoverAnimator(logs, [
    { trigger: `.messageItem`, image: ".clanIcon img" },
    { trigger: `.messageItem`, image: ".avatar img" },
    { trigger: `.messageItem`, image: ".emoji" },
  ]);

  createMessageReactionHandler({ logs, signal });
  const imageEmbedFocusAnimator = new FocusAnimator(logs, ".imageEmbed .image");

  scrollToBottom(true);

  const render = () => {
    if (accountStore.authenticated) {
      onBottomSkeletonIntersect(true);
    }
    return el;
  };

  chatbar.jumpToPresentButton.addEventListener(
    "click",
    async () => {
      if (channelStore.currentChannelProperty()?.canLoadBottom) {
        await onBottomSkeletonIntersect(true, true);
      }
      el.scrollTop = el.scrollHeight;
    },
    { signal },
  );

  const destroy = () => {
    abortController.abort();
    imageEmbedResizer.destroy();
    imageEmbedFocusAnimator.destroy();
    hoverAnimator.destroy();

    chatbar.destroy();
    el.remove();
    logs.remove();
  };

  return { render, destroy };
};

export default createMessagePane;
