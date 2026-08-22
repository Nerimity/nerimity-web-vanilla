import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { inboxStore } from "../../store/inboxStore";
import { storeEmitter } from "../../utils/EventEmitter";
import { MiniProfile } from "../miniProfile";

import style from "./InboxInfoDrawer.module.css";

export const createInboxInfoDrawer = () => {
  const abortController = new AbortController();

  const { signal } = abortController;

  let infoEl = (<div class={style.info}></div>) as HTMLDivElement;

  let contentAbortController = new AbortController();

  const renderRightDrawer = () => {
    contentAbortController.abort();
    contentAbortController = new AbortController();
    if (!accountStore.authenticated) return;
    const inbox = inboxStore.inboxes.get(channelStore.currentChannelId!);

    const recipientId = inbox?.recipientId;
    if (!recipientId) return;

    infoEl.replaceChildren(
      <MiniProfile
        animationMode="hover"
        abort={contentAbortController}
        class={style.miniProfileDrawer}
        showChannelNotice
        userId={recipientId}
      />,
    );
  };

  renderRightDrawer();
  requestAnimationFrame(() => {
    storeEmitter.on("navigate:channelId", renderRightDrawer, signal);
  });
  storeEmitter.on(
    "ws:authStateUpdate",
    (state) => {
      if (!state) return;
      renderRightDrawer();
    },
    signal,
  );

  const destroy = () => {
    contentAbortController.abort();
    abortController.abort();
    infoEl?.remove();
    (infoEl as any) = null;
  };
  const render = () => infoEl;

  return {
    destroy,
    render,
  };
};
