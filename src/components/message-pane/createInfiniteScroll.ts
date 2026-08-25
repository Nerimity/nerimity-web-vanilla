import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { messageStore } from "../../store/messageStore";
import { debounce } from "../../utils/debounce";
import { createIntersectionObserver } from "../../utils/observer";
import { router } from "../../utils/router";
import { Drawer } from "../drawer";

interface InfiniteScrollParams {
  el: HTMLDivElement;
  logs: HTMLDivElement;
  skeletonsTop: HTMLDivElement;
  skeletonsBottom: HTMLDivElement;
  signal: AbortSignal;
  rerender: (opts?: {
    preventScrollDown?: boolean;
    useSavedTop?: boolean;
    forceScrollDown?: boolean;
  }) => Promise<void>;
  scrollToBottom: (force?: boolean) => void;
  shouldShowBottomSkel: () => boolean;
}

export const createInfiniteScroll = (params: InfiniteScrollParams) => {
  const query = router.query<{ messageId: string }>();

  let {
    el,
    logs,
    skeletonsTop,
    skeletonsBottom,
    signal,
    rerender,
    scrollToBottom,
    shouldShowBottomSkel,
  } = params;

  const handleStillObserving = debounce(() => {
    if (topObserver.intersecting) {
      onTopSkeletonIntersect();
      return;
    }

    if (bottomObserver.intersecting) {
      onBottomSkeletonIntersect();
      return;
    }
  }, 1000);

  const onTopSkeletonIntersect = async () => {
    const channelId = channelStore.currentChannelId;
    if (!channelId) return;
    const properties = channelStore.getProperty(channelId);
    if (properties!.loading) return;

    const messages = messageStore.messages.get(channelId);
    const firstMessageId = messages?.[0]?.id;
    if (!firstMessageId) return;

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

    const messageEls = logs.querySelectorAll(".messageItem");
    const firstMessage = messageEls[0]?.parentElement!;
    const firstMessageBottom = firstMessage.getBoundingClientRect().bottom;

    rerender({ preventScrollDown: true });

    const afterBottom = firstMessage.getBoundingClientRect().bottom;
    const difference = afterBottom - firstMessageBottom!;
    el.scrollTop = el.scrollTop + difference;

    handleStillObserving();
  };

  const onBottomSkeletonIntersect = async (
    loadNew?: boolean,
    force?: boolean,
  ) => {
    skeletonsBottom.classList.toggle("hide", !shouldShowBottomSkel());

    const channelId = channelStore.currentChannelId;
    if (!channelId) return;
    const properties = channelStore.getProperty(channelId)!;
    if (properties.loading) return;

    const setLoadingFalse = () => {
      channelStore.setProperty(channelId, { loading: false });
    };

    channelStore.setProperty(channelId, { loading: true });
    const messages = messageStore.messages.get(channelId);
    // if there are no messages, load them.
    if (loadNew) {
      if (messages && !force) {
        rerender({ useSavedTop: true, forceScrollDown: true });
        return setLoadingFalse();
      }
      if (!accountStore.authenticated) {
        return setLoadingFalse();
      }
      if (query().messageId) {
        return scrollToMessage(true);
      }

      const newMessages = await messageStore.loadMessages(channelId, { force });
      if (!newMessages) {
        return setLoadingFalse();
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
    if (!messages) return setLoadingFalse();
    const lastMessageId = messages[messages.length - 1]?.id;
    if (!lastMessageId) return setLoadingFalse();

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

    const messageEls = logs.querySelectorAll(".messageItem");
    const lastMessage = messageEls[messageEls.length - 1]!;
    const lastMessageBottom = lastMessage.getBoundingClientRect().bottom;

    rerender({ preventScrollDown: true });

    const afterBottom = lastMessage.getBoundingClientRect().bottom;
    const difference = afterBottom - lastMessageBottom!;
    el.scrollTop = el.scrollTop + difference;

    handleStillObserving();
  };

  const bottomObserver = createIntersectionObserver(
    skeletonsBottom,
    el,
    onBottomSkeletonIntersect,
    { signal },
  );
  const topObserver = createIntersectionObserver(
    skeletonsTop,
    el,
    onTopSkeletonIntersect,
    { signal },
  );

  window.addEventListener(
    "focus",
    () => {
      setTimeout(() => {
        scrollToMessage();
      }, 100);
    },
    { signal },
  );

  const scrollToMessage = async (force = false) => {
    const messageId = query().messageId;
    const channelId = channelStore.currentChannelId!;
    if (!messageId) return;
    Drawer().updatePage({ page: 1 });
    let animate = true;
    if (document.hasFocus()) {
      router.navigate(location.pathname, { replace: true });
    }

    let messageItemEl = document.querySelector(
      `[data-message-id="${messageId}"] .messageItem`,
    ) as HTMLDivElement;

    if (!messageItemEl) {
      animate = false;

      const property = channelStore.getProperty(channelId);
      if (!force) {
        if (property?.loading) return;
      }

      if (property) {
        property.canLoadBottom = true;
        property.canLoadTop = true;
        property.loading = true;
      }

      messageStore.messages.delete(channelId);
      await rerender();

      await messageStore.loadMessages(channelId, {
        around: messageId,
        force: true,
      });
      await rerender();
      if (property) {
        property.loading = false;
      }
    }

    setTimeout(() => {
      messageItemEl = document.querySelector(
        `[data-message-id="${messageId}"] .messageItem`,
      ) as HTMLDivElement;

      setTimeout(() => {
        handleStillObserving();
      }, 1000);
      if (messageItemEl) {
        messageItemEl?.scrollIntoView({
          behavior: animate ? "smooth" : "instant",
          inline: "nearest",
          block: "center",
        });

        messageItemEl.style.background = "var(--primary-dark)";
        setTimeout(() => {
          messageItemEl.style.background = "";
        }, 3000);
      }
    }, 100);
  };
  router.createQueryListener(() => scrollToMessage(), { signal, defer: true });

  signal.addEventListener(
    "abort",
    () => {
      (el as any) = null;
      (skeletonsBottom as any) = null;
      (skeletonsTop as any) = null;
      (logs as any) = null;
    },
    { once: true },
  );

  return { onBottomSkeletonIntersect };
};
