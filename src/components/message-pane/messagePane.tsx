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
import { MessageItem } from "./messageItem";
import { createMessageReactionHandler } from "./MessageReactions";
import { getLastSeenMessage, shouldGroup } from "./utils";

import style from "./messagePane.module.css";

const SCROLLED_BOTTOM_THRESHOLD = 50;

const createMessagePane = () => {
  const abortController = new AbortController();
  const { signal } = abortController;
  let chatbar = createChatbar();
  const logs = (<div class={style.logs}></div>) as unknown as HTMLDivElement;

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
    <div class={[shouldShowTopSkel() ? "" : style.hide]}>
      {Array.from({ length: 26 }, () => (
        <MessageSkeleton />
      ))}
    </div>
  ) as HTMLDivElement;

  const skeletonsBottom = (
    <div class={[shouldShowBottomSkel() ? "" : style.hide]}>
      {Array.from({ length: 26 }, () => (
        <MessageSkeleton />
      ))}
    </div>
  ) as HTMLDivElement;

  const bottomSentinel = (
    <div class={style.bottomSentinel} />
  ) as HTMLDivElement;

  let chatbarEl = chatbar.render();

  const el = (
    <div class={[style.messagePane, "scrollbarHover"]}>
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

    const newMessageEl = (
      <MessageItem
        container={el}
        message={message}
        prevMessage={messages?.[index - 1]}
      />
    ) as HTMLElement;

    const createdByMe = message.createdBy.id === accountStore.currentUser?.id;
    // this is done like this to fix uploading image attachment causes it to not load the image.
    if (createdByMe) {
      if (message.tempId) {
        messageEl.replaceWith(newMessageEl);
        return;
      }
    }

    morphdom(messageEl, newMessageEl);
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
    skeletonsBottom.classList.toggle(style.hide!, !shouldShowBottomSkel());

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

    skeletonsTop.classList.toggle(style.hide!, !shouldShowTopSkel());
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
      skeletonsBottom.classList.toggle(style.hide!, !shouldShowBottomSkel());
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
  createAttachmentProgressHandler(signal, el);

  const destroy = () => {
    abortController.abort();
    imageEmbedResizer.destroy();
    imageEmbedFocusAnimator.destroy();
    hoverAnimator.destroy();

    chatbar.destroy();
    el.remove();
    logs.remove();
    chatbarEl.remove();
    (chatbar as any) = null;
    (chatbarEl as any) = null;
  };

  return { render, destroy };
};

export default createMessagePane;

const createAttachmentProgressHandler = (
  signal: AbortSignal,
  el: HTMLElement,
) => {
  storeEmitter.on(
    "attachment:upload_progress",
    (event) => {
      const uploadFileContainer = el.querySelector(
        `[data-message-id="${event.messageId}"] .progressContainer`,
      );

      if (uploadFileContainer) {
        const bar = uploadFileContainer.querySelector(".bar") as HTMLDivElement;
        if (!bar) return;

        const percent = uploadFileContainer.querySelector(
          ".percent",
        ) as HTMLDivElement;
        if (!percent) return;

        const speed = uploadFileContainer.querySelector(
          ".speed",
        ) as HTMLDivElement;
        if (!speed) return;

        bar.style.width = `${event.progress}%`;
        percent.textContent = `${event.progress}%`;
        speed.textContent = `${event.speed}`;
        return;
      }

      const uploadImageContainer = el.querySelector(
        `[data-message-id="${event.messageId}"] .uploadProgressContainer`,
      );
      if (!uploadImageContainer) return;
      uploadImageContainer.replaceChildren(
        `Uploading ${event.progress}% (${event.speed})`,
      );
    },
    signal,
  );
};