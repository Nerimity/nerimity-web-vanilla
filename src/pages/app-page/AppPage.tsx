import { createAppHeader } from "../../components/appHeader";
import { Drawer } from "../../components/drawer";
import { handleDangerLink } from "../../components/markup/MarkupLink";
import { createMiniProfileHandler } from "../../components/miniProfile";
import { createSidebar } from "../../components/sidebar";
import { mobileWidth } from "../../config";
import { h, Fragment } from "../../h";
import { socket } from "../../services/socket";
import { channelStore } from "../../store/channelStore";
import { serverStore } from "../../store/serverStore";
import { createTokenSource } from "../../utils/createTokenSource";
import { lazyLoadEmojis } from "../../utils/emojis";
import { lazy, type LazyResult } from "../../utils/lazy";
import { router } from "../../utils/router";
import type createInboxChannelRoute from "./createInboxChannelRoute";
import type createServerChannelRoute from "./createServerChannelRoute";

import style from "./AppPage.module.css";
const createMessagePane = lazy(
  () => import("../../components/message-pane/messagePane"),
);

const createAppPage = () => {
  lazyLoadEmojis();
  const abortController = new AbortController();
  const { signal } = abortController;
  socket.connect();
  const app = document.getElementById("app")!;
  let appHeader = createAppHeader();
  const serverSidebar = createSidebar();

  let messagePane: LazyResult<typeof createMessagePane> | null = null;

  let leftDrawer = (<div class={style.leftDrawerInner}></div>) as HTMLElement;
  let content = (<div class={style.contentInner}></div>) as HTMLElement;

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

  let inboxChannelPage: ReturnType<typeof createInboxChannelRoute> | null =
    null;

  const appRouteSource = createTokenSource();

  router.createMatchListener<{ serverId: string; channelId: string }>(
    "/app/servers/:serverId/:channelId",
    async (res) => {
      serverStore.setCurrentServerId(res?.params.serverId);
      if (!res) {
        serverChannelPage?.destroy();
        serverChannelPage = null;
        if (inboxChannelPage) return;
        const isStale = appRouteSource.capture();

        const createInboxChannelRoute = (
          await import("./createInboxChannelRoute")
        ).default;

        if (isStale()) return;
        inboxChannelPage = createInboxChannelRoute(leftDrawer);
        return;
      }

      appRouteSource.invalidate();

      if (serverChannelPage) return;
      inboxChannelPage?.destroy();
      inboxChannelPage = null;

      const isStale = appRouteSource.capture();
      const createServerChannelRoute = (
        await import("./createServerChannelRoute")
      ).default;

      if (isStale()) return;
      serverChannelPage = createServerChannelRoute(leftDrawer);
    },
    { signal },
  );

  router.createMatchListener<{ channelId: string }>(
    ["/app/servers/:serverId/:channelId", "/app/inbox/:channelId"],
    async (res) => {
      channelStore.setCurrentChannelId(res?.params.channelId);
      if (!res) {
        messagePane?.destroy();
        messagePane = null;
        content.replaceChildren();
        Drawer().updateRightDrawerAvailable(false);
        return;
      }
      Drawer().updateRightDrawerAvailable(true);
      if (messagePane) return;
      messagePane = await createMessagePane();
      content.replaceChildren(messagePane.render());
    },
    { signal },
  );

  createMiniProfileHandler({ signal });

  const handleResize = () => {
    if (window.innerWidth < mobileWidth) {
      document.body.classList.add("mobileWidth");
      document.body.classList.remove("desktopWidth");
    } else {
      document.body.classList.remove("mobileWidth");
      document.body.classList.add("desktopWidth");
    }
  };
  handleResize();

  window.addEventListener("resize", handleResize, { signal });
  handleDangerLink(signal);

  const destroy = () => {
    abortController.abort();
    socket.disconnect();
    serverSidebar.destroy();
    appHeader.destroy();
    messagePane?.destroy();
    serverChannelPage?.destroy();
    serverChannelPage = null;
    inboxChannelPage?.destroy();
    Drawer().destroy();

    (leftDrawer as any) = null;
    (content as any) = null;
  };

  const render = () => {};

  return { render, destroy };
};

export default createAppPage;
