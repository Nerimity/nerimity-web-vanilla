import { t } from "@lingui/core/macro";
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
import { portalElement } from "../../utils/portal";
import { setRecentServerChannel } from "../../utils/recentServerChannels";
import { ContextMenu } from "../ContextMenu";
import { Drawer } from "../drawer";
import { handleImagePreviewModal } from "../ImagePreviewModal";
import { createModal } from "../modal";
import { MessageSkeleton } from "../skeleton";
import { createChatbar } from "./chatbar";
import { createInfiniteScroll } from "./createInfiniteScroll";
import { createDeleteMessageModal } from "./deleteMessageModal";
import { createImageEmbedResizer } from "./imageEmbed";
import { createMessageHoverActions } from "./messageHoverActions";
import { MessageItem } from "./messageItem";
import { createMessageReactionHandler } from "./MessageReactions";
import { canDeleteMessage, getLastSeenMessage, shouldGroup } from "./utils";

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
  const scrollContainer = Drawer().content as HTMLDivElement;

  const el = (
    <div class={style.messagePane}>
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
      scrollContainer.scrollTop + scrollContainer.clientHeight >=
      scrollContainer.scrollHeight - SCROLLED_BOTTOM_THRESHOLD;
    if (prev !== isScrolledToBottom) {
      storeEmitter.emit("channel:scrolledToBottom", isScrolledToBottom);
    }
  };

  scrollContainer.addEventListener("scroll", updateScrolledToBottom, {
    passive: true,
    signal,
  });

  const scrollToBottom = (force?: boolean) => {
    if (!force && !isScrolledToBottom) return;
    // when drawer is  currently being dragged, don't reset the position.
    requestAnimationFrame(() => {
      Drawer().setIgnoreNextScroll();
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
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
        container={scrollContainer}
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
        scrollContainer.scrollTop = savedScrollTop;
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
          container={scrollContainer}
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
    restoreScrollPosition(opts);
    requestAnimationFrame(() => {
      updateScrolledToBottom();
      dismissNotification();
    });
  };
  const { onBottomSkeletonIntersect } = createInfiniteScroll({
    el: scrollContainer,
    logs,
    skeletonsTop,
    skeletonsBottom,
    signal,
    rerender,
    scrollToBottom,
    shouldShowBottomSkel,
  });

  const imageEmbedResizer = createImageEmbedResizer(scrollContainer);

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
      const scrollTop = scrollContainer.scrollTop;

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

  createIntersectionObserver(
    bottomSentinel,
    scrollContainer,
    dismissNotification,
    {
      signal,
      rootMargin: "0px 0px -50px 0px",
    },
  );

  const checkAndScrollBottom = () => {
    const property = getChannelProperty();
    if (property?.scrollTop === undefined) scrollToBottom();
  };

  createResizeObserver(logs, checkAndScrollBottom, { signal });
  createResizeObserver(chatbarEl, checkAndScrollBottom, { signal });
  createResizeObserver(document.getElementById("app")!, checkAndScrollBottom, {
    signal,
  });
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
    { trigger: `.messageItem`, image: "details .emoji" },
  ]);

  createMessageReactionHandler({ logs, signal });
  const imageEmbedFocusAnimator = new FocusAnimator(
    logs,
    ".imageEmbed .image, .focusAnimate .emoji",
  );

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
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    },
    { signal },
  );
  createAttachmentProgressHandler(signal, el);
  createMessageContextMenuHandler({ el, signal });

  handleBlockedMessageClick({ el, signal, updateMessage });

  handleImagePreviewModal({ root: el, signal, selector: ".imageEmbed .image" });

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

const createMessageContextMenuHandler = (opts: {
  el: HTMLElement;
  signal: AbortSignal;
}) => {
  opts.el.addEventListener("contextmenu", (event) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-user-id]")) return;

    const messageEl = target.closest(`[data-message-id]`) as HTMLElement;
    if (!messageEl) return;
    const messageId = messageEl.dataset?.messageId!;

    const abortController = new AbortController();

    if (!messageId) return;
    event.preventDefault();

    const message = messageStore.messages
      .get(channelStore.currentChannelId!)
      ?.find((m) => m.id === messageId);
    if (!message) return;

    portalElement().addEventListener(
      "click",
      (event) => {
        abortController.abort();
        const target = event.target as HTMLElement;
        const item = target.closest(".ctx-item");
        const id = item?.id;
        switch (id) {
          case "delete":
            createDeleteMessageModal({
              message,
              skipConfirmation: event.shiftKey,
            });
            break;
          case "edit":
            channelStore.setEditingMessage(
              channelStore.currentChannelId!,
              message,
            );
            break;
          case "copy":
            navigator.clipboard.writeText(message.content);
            break;
          case "copy_id":
            navigator.clipboard.writeText(message.id);
            break;
          case "copy_object":
            console.log("Copied message object to clipboard:", message);
            navigator.clipboard.writeText(JSON.stringify(message));
            break;
          case "reply":
            channelStore.addReply(channelStore.currentChannelId!, message);
            break;
          default:
            break;
        }
      },
      { signal: abortController.signal },
    );

    createModal(
      () => (
        <MessageContextMenu
          message={message}
          x={`${event.clientX}px`}
          y={`${event.clientY}px`}
        />
      ),
      abortController,
    );
    opts.signal.addEventListener("abort", () => abortController.abort(), {
      once: true,
    });
  });
};

const MessageContextMenu = (props: {
  message: Message;
  x: string;
  y: string;
}) => {
  return (
    <ContextMenu.Root pos={{ x: props.x, y: props.y }} id="msg-ctx">
      <ContextMenu.Item id="edit">
        <ContextMenu.Icon name="edit" />
        <ContextMenu.Label>{t`Edit Message`}</ContextMenu.Label>
      </ContextMenu.Item>
      <ContextMenu.Item id="reply">
        <ContextMenu.Icon name="reply" />
        <ContextMenu.Label>{t`Reply Message`}</ContextMenu.Label>
      </ContextMenu.Item>
      {canDeleteMessage({ message: props.message }) && (
        <ContextMenu.Item alert id="delete">
          <ContextMenu.Icon name="delete" />
          <ContextMenu.Label>{t`Delete Message`}</ContextMenu.Label>
        </ContextMenu.Item>
      )}
      <ContextMenu.Separator />
      <ContextMenu.Item id="copy">
        <ContextMenu.Icon name="content_copy" />
        <ContextMenu.Label>{t`Copy Content`}</ContextMenu.Label>
      </ContextMenu.Item>
      <ContextMenu.Item id="copy_id">
        <ContextMenu.Icon name="content_copy" />
        <ContextMenu.Label>{t`Copy ID`}</ContextMenu.Label>
      </ContextMenu.Item>
      <ContextMenu.Item id="copy_object">
        <ContextMenu.Icon name="content_copy" />
        <ContextMenu.Label>{t`Copy Object`}</ContextMenu.Label>
      </ContextMenu.Item>
    </ContextMenu.Root>
  );
};

const handleBlockedMessageClick = (opts: {
  el: HTMLElement;
  signal: AbortSignal;
  updateMessage: (message: Message, index: number) => void;
}) => {
  opts.el.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const messageEl = target.closest(`[data-message-id]`) as HTMLElement;
    const messageId = messageEl?.dataset?.messageId!;
    if (!messageId) return;
    const isBlocked = messageEl.querySelector(`[data-blocked="true"]`);
    if (!isBlocked) return;

    const messages = messageStore.messages.get(channelStore.currentChannelId!);
    const messageIndex = messages?.findIndex((m) => m.id === messageId) ?? -1;
    const message = messages?.[messageIndex];
    if (!message) return;
    message.showBlocked = true;
    opts.updateMessage(message, messageIndex);
  });
};
