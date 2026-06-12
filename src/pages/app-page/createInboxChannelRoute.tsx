import { css } from "@linaria/core";

import { Drawer } from "../../components/drawer";
import createInboxDrawer from "../../components/inboxDrawer";
import { MiniProfile } from "../../components/miniProfile";
import { h } from "../../h";
import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { inboxStore } from "../../store/inboxStore";
import { storeEmitter } from "../../utils/EventEmitter";

const miniProfileDrawer = css`
  width: 100%;
  margin-left: 4px;
  padding-top: 6px;
`;

const createInboxChannelRoute = (leftDrawer: HTMLElement) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const inboxDrawer = createInboxDrawer();
  const drawer = Drawer();

  leftDrawer.replaceChildren(inboxDrawer.render());

  const destroy = () => {
    abortController.abort();
    inboxDrawer.destroy();
  };

  const renderRightDrawer = () => {
    if (!accountStore.authenticated) return;
    console.log("rerender");
    const inbox = inboxStore.inboxes.get(channelStore.currentChannelId!);

    const recipientId = inbox?.recipientId;
    if (!recipientId) return;

    drawer.rightDrawer.replaceChildren(
      <MiniProfile
        class={[miniProfileDrawer, "scrollbarHover"]}
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

  return { destroy };
};

export default createInboxChannelRoute;
