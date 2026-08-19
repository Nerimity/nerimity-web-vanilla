import { Drawer } from "../../components/drawer";
import createInboxDrawer from "../../components/inboxDrawer";
import { createRightDrawer } from "../../components/right-drawer/RightDrawer";
import { channelStore } from "../../store/channelStore";
import { storeEmitter } from "../../utils/EventEmitter";

export const createInboxChannelRoute = (leftDrawer: HTMLElement) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const inboxDrawer = createInboxDrawer();
  let rightDrawer: ReturnType<typeof createRightDrawer> | undefined = undefined;

  let drawer = Drawer();

  leftDrawer.replaceChildren(inboxDrawer.render());

  let miniProfileAbortController = new AbortController();

  const renderRightDrawer = () => {
    if (!channelStore.currentChannelId) {
      rightDrawer?.destroy();
      drawer.rightDrawer.replaceChildren();
      return;
    }
    rightDrawer = createRightDrawer();
    drawer.rightDrawer.replaceChildren(rightDrawer.render());
  };

  renderRightDrawer();

  let prevChannelId = channelStore.currentChannelId;
  storeEmitter.on(
    "navigate:channelId",
    () => {
      const currentChannelId = channelStore.currentChannelId;
      if (prevChannelId === null || currentChannelId === null) {
        if (prevChannelId !== currentChannelId) {
          renderRightDrawer();
        }
      }
      prevChannelId = currentChannelId;
    },
    signal,
  );

  const destroy = () => {
    miniProfileAbortController.abort();
    drawer.rightDrawer.replaceChildren();
    abortController.abort();
    inboxDrawer.destroy();

    rightDrawer?.destroy();

    (leftDrawer as any) = null;
    (drawer as any) = null;
  };

  return { destroy };
};
