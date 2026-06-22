import { Drawer } from "../../components/drawer";
import createInboxDrawer from "../../components/inboxDrawer";
import { MiniProfile } from "../../components/miniProfile";
import { h } from "../../h";
import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { inboxStore } from "../../store/inboxStore";
import { storeEmitter } from "../../utils/EventEmitter";

import style from "./createInboxChannelRoute.module.css";

const createInboxChannelRoute = (leftDrawer: HTMLElement) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const inboxDrawer = createInboxDrawer();
  let drawer = Drawer();

  leftDrawer.replaceChildren(inboxDrawer.render());

  let miniProfileAbortController = new AbortController();
  const renderRightDrawer = () => {
    miniProfileAbortController.abort();
    miniProfileAbortController = new AbortController();
    if (!accountStore.authenticated) return;
    const inbox = inboxStore.inboxes.get(channelStore.currentChannelId!);

    const recipientId = inbox?.recipientId;
    if (!recipientId) return;

    drawer.rightDrawer.replaceChildren(
      <MiniProfile
        animationMode="hover"
        signal={miniProfileAbortController.signal}
        class={style.miniProfileDrawer}
        userId={recipientId}
      />,
    );
  };

  renderRightDrawer();

  storeEmitter.on(
    "navigate:channelId",
    () => {
      renderRightDrawer();
    },
    signal,
  );
  storeEmitter.on(
    "ws:authStateUpdate",
    (state) => {
      if (!state) return;
      renderRightDrawer();
    },
    signal,
  );

  const destroy = () => {
    miniProfileAbortController.abort();
    drawer.rightDrawer.replaceChildren();
    abortController.abort();
    inboxDrawer.destroy();
    (leftDrawer as any) = null;
    (drawer as any) = null;
  };

  return { destroy };
};

export default createInboxChannelRoute;