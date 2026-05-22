import { css } from "@linaria/core";

import { createAppHeader } from "../../components/appHeader";
import { Drawer } from "../../components/drawer";
import { createInboxDrawer } from "../../components/inboxDrawer";
import { createSidebar } from "../../components/sidebar";
import { h, Fragment } from "../../h";
import { socket } from "../../services/socket";
import { channelStore } from "../../store/channelStore";
import { serverStore } from "../../store/serverStore";
import { lazyLoadEmojis } from "../../utils/emojis";
import { router } from "../../utils/router";
import type createServerChannelRoute from "./createServerChannelRoute";

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

  let serverChannelPage: ReturnType<typeof createServerChannelRoute> | null =
    null;

  let inboxDrawer: ReturnType<typeof createInboxDrawer> | null = null;

  router.createMatchListener<{ serverId: string; channelId: string }>(
    "/app/servers/:serverId/:channelId",
    async (res) => {
      serverStore.setCurrentServerId(res?.params.serverId);
      channelStore.setCurrentChannelId(res?.params.channelId);
      if (!res) {
        inboxDrawer = createInboxDrawer();
        leftDrawer.replaceChildren(inboxDrawer.render());
        serverChannelPage?.destroy();
        serverChannelPage = null;
        return;
      }

      if (serverChannelPage) return;
      inboxDrawer?.destroy();
      inboxDrawer = null;
      const createServerChannelRoute = (
        await import("./createServerChannelRoute")
      ).default;
      serverChannelPage = createServerChannelRoute(leftDrawer, content);
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
    inboxDrawer?.destroy();
    Drawer().destroy();
  };

  const render = () => {};

  return { render, destroy };
};

export default createAppPage;
