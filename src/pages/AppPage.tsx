import { css } from "@linaria/core";

import { createAppHeader } from "../components/appHeader";
import { Drawer } from "../components/drawer";
import { createMessagePane } from "../components/message-pane/messagePane";
import { createServerChannelList } from "../components/serverChannelList";
import { createServerMemberList } from "../components/serverMemberList";
import { createSidebar } from "../components/sidebar";
import { h, Fragment } from "../h";
import { socket } from "../services/socket";
import { channelStore } from "../store/channelStore";
import { serverStore } from "../store/serverStore";
import { lazyLoadEmojis } from "../utils/emojis";
import { storeEmitter } from "../utils/EventEmitter";
import { router } from "../utils/router";

const content = css`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  flex: 1;
  overflow: hidden;
`;

const leftDrawerInner = css`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  flex: 1;
  overflow: hidden;
`;

const handleServerChannelRoute = (leftDrawer: HTMLElement) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  let messagePane: ReturnType<typeof createMessagePane> | null = null;

  let contentEl = (<div class={content}></div>) as unknown as HTMLElement;

  let appHeader = createAppHeader();

  const serverChannelList = createServerChannelList();
  const serverMemberList = createServerMemberList();
  const drawer = Drawer();

  leftDrawer.replaceChildren(serverChannelList.render());
  drawer.content.replaceChildren(appHeader.render(), contentEl);

  drawer.rightDrawer.replaceChildren(serverMemberList.render());

  messagePane = createMessagePane();
  contentEl.replaceChildren(messagePane.render());

  storeEmitter.on(
    "ws:authStateUpdate",
    (state) => {
      if (!state) return;
      serverStore.currentServerSortedRoles.rerun();
      serverStore.currentChannelsSorted.rerun();
    },
    signal,
  );

  const destroy = () => {
    abortController.abort();
    appHeader.destroy();
    messagePane?.destroy();
    contentEl.remove();
    serverChannelList.destroy();
    serverMemberList.destroy();
  };

  return { destroy };
};

const createAppPage = () => {
  lazyLoadEmojis();
  const abortController = new AbortController();
  const { signal } = abortController;
  socket.connect();
  const app = document.getElementById("app")!;
  app.replaceChildren(Drawer().render());
  const serverSidebar = createSidebar();

  const leftDrawer = (<div class={leftDrawerInner}></div>) as HTMLElement;

  Drawer().leftDrawer.replaceChildren(
    <>
      {serverSidebar.render()}
      {leftDrawer}
    </>,
  );

  let serverChannelPage: ReturnType<typeof handleServerChannelRoute> | null =
    null;

  router.createMatchListener<{ serverId: string; channelId: string }>(
    "/app/servers/:serverId/:channelId",
    (res) => {
      serverStore.setCurrentServerId(res?.params.serverId);
      channelStore.setCurrentChannelId(res?.params.channelId);
      if (!res) {
        serverChannelPage?.destroy();
        serverChannelPage = null;
        return;
      }

      if (serverChannelPage) return;
      serverChannelPage = handleServerChannelRoute(leftDrawer);
    },
    { signal },
  );

  const destroy = () => {
    abortController.abort();
    socket.disconnect();
    serverSidebar.destroy();

    Drawer().destroy();
  };

  const render = () => {};

  return { render, destroy };
};

export default createAppPage;
