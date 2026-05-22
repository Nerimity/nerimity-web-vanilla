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

const leftDrawerInner = css`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  flex: 1;
  overflow: hidden;
`;

const contentInner = css`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  flex: 1;
  overflow: hidden;
`;

const handleServerChannelRoute = (
  leftDrawer: HTMLElement,
  content: HTMLElement,
) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  let messagePane: ReturnType<typeof createMessagePane> | null = null;

  const serverChannelList = createServerChannelList();
  const serverMemberList = createServerMemberList();
  const drawer = Drawer();

  leftDrawer.replaceChildren(serverChannelList.render());

  drawer.rightDrawer.replaceChildren(serverMemberList.render());

  messagePane = createMessagePane();
  content.replaceChildren(messagePane.render());

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
    messagePane?.destroy();
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
  let appHeader = createAppHeader();
  const serverSidebar = createSidebar();

  const leftDrawer = (<div class={leftDrawerInner}></div>) as HTMLElement;
  const content = (<div class={contentInner}></div>) as HTMLElement;

  Drawer().leftDrawer.replaceChildren(
    <>
      {serverSidebar.render()}
      {leftDrawer}
    </>,
  );

  Drawer().content.replaceChildren(
    <>
      {appHeader.render()} {content}
    </>,
  );
  app.replaceChildren(Drawer().render());

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
      serverChannelPage = handleServerChannelRoute(leftDrawer, content);
    },
    { signal },
  );

  const destroy = () => {
    abortController.abort();
    socket.disconnect();
    serverSidebar.destroy();
    appHeader.destroy();
    serverChannelPage?.destroy();
    serverChannelPage = null;

    Drawer().destroy();
  };

  const render = () => {};

  return { render, destroy };
};

export default createAppPage;
