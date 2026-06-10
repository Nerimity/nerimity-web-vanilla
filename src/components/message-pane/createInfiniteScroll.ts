import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { messageStore } from "../../store/messageStore";
import { debounce } from "../../utils/debounce";
import { createIntersectionObserver } from "../../utils/observer";

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
  }) => void;
  scrollToBottom: (force?: boolean) => void;
  shouldShowBottomSkel: () => boolean;
}

export const createInfiniteScroll = (params: InfiniteScrollParams) => {
  const {
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

    rerender({ preventScrollDown: true });
    const newAnchorOffsetTop = anchorEl?.offsetTop ?? 0;
    el.scrollTop += newAnchorOffsetTop - anchorOffsetTop;
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

  return { onBottomSkeletonIntersect };
};
