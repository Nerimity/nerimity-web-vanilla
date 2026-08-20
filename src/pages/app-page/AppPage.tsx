import { createAppHeader } from "../../components/appHeader";
import { Drawer } from "../../components/drawer";
import { handleDangerLink } from "../../components/markup/MarkupLink";
import { createMiniProfileHandler } from "../../components/miniProfile";
import { createSidebar } from "../../components/sidebar";
import { createUserContextMenuHandler } from "../../components/UserContextMenu";
import { isMobileWidth } from "../../config";
import { h, Fragment } from "../../h";
import { socket } from "../../services/socket";
import { channelStore } from "../../store/channelStore";
import { serverStore } from "../../store/serverStore";
import { createTokenSource } from "../../utils/createTokenSource";
import { lazyLoadEmojis } from "../../utils/emojis";
import { router } from "../../utils/router";

import style from "./AppPage.module.css";

type Page = { destroy: () => void };
type MatchResult<P> = { params: P } | null | undefined;

export interface RouteContext {
  content: HTMLDivElement;
  leftDrawer: HTMLDivElement;
}

function registerPaneRoute<T extends Page, P = unknown>(opts: {
  paths: string | string[];
  signal: AbortSignal;
  tokenSource: ReturnType<typeof createTokenSource>;
  context: RouteContext;
  load: (res: {
    params: P;
  }) => Promise<{ default: (context: RouteContext) => T | Promise<T> }>;
  onRoute?: (res: MatchResult<P>) => void;
  onMatch?: () => void;
  onUnmatch?: () => void;
  alwaysRemount?: boolean;
}) {
  let pane: T | null = null;

  router.createMatchListener<P>(
    opts.paths,
    async (res) => {
      opts.onRoute?.(res);

      if (!res) {
        pane?.destroy();
        pane = null;
        opts.onUnmatch?.();
        return;
      }

      opts.onMatch?.();
      if (pane && !opts.alwaysRemount) return;
      pane?.destroy();

      const isStale = opts.tokenSource.capture();
      const module = await opts.load(res);
      if (isStale()) return;
      pane = await module.default(opts.context);
    },
    { signal: opts.signal },
  );

  return {
    destroy: () => {
      pane?.destroy();
      pane = null;
    },
  };
}

let appHeader: ReturnType<typeof createAppHeader> | undefined = undefined;

export const getAppHeader = () => appHeader;

const createAppPage = () => {
  lazyLoadEmojis();
  const abortController = new AbortController();
  const { signal } = abortController;
  socket.connect();

  createUserContextMenuHandler({ signal });
  const app = document.getElementById("app")!;
  const drawer = Drawer();
  appHeader = createAppHeader();
  const serverSidebar = createSidebar();

  const leftDrawer = (
    <div class={style.leftDrawerInner}></div>
  ) as HTMLDivElement;
  const content = (<div class={style.contentInner}></div>) as HTMLDivElement;

  drawer.leftDrawer.replaceChildren(
    <>
      {serverSidebar.render()}
      {leftDrawer}
    </>,
  );
  drawer.content.replaceChildren(
    <>
      {appHeader.render()} {content}
    </>,
  );
  app.replaceChildren(drawer.render());

  const appRouteSource = createTokenSource();
  const contentSource = createTokenSource();

  const context: RouteContext = {
    leftDrawer,
    content,
  };

  const routes = [
    registerPaneRoute({
      paths: "/app",
      signal,
      tokenSource: contentSource,
      load: () => import("./createHomePane"),
      context,
    }),

    registerPaneRoute<Page, { userId: string }>({
      paths: "/app/profile/:userId",
      signal,
      tokenSource: contentSource,
      alwaysRemount: true,
      load: () => import("./profile-pane/createProfilePane"),
      context,
    }),

    registerPaneRoute({
      paths: ["/app", "/app/inbox/*", "/app/profile/*"],
      signal,
      tokenSource: appRouteSource,
      load: () => import("./createInboxChannelRoute"),
      context,
    }),

    registerPaneRoute<Page, { serverId: string; channelId: string }>({
      paths: "/app/servers/:serverId/:channelId",
      signal,
      tokenSource: appRouteSource,
      onRoute: (res) => serverStore.setCurrentServerId(res?.params.serverId),
      load: () => import("./createServerChannelRoute"),
      context,
    }),
    registerPaneRoute<Page>({
      paths: "/app/settings{/*}?",
      signal,
      tokenSource: appRouteSource,
      load: () => import("./createSettingsRoute"),
      context,
    }),

    registerPaneRoute<Page, { channelId: string }>({
      paths: ["/app/servers/:serverId/:channelId", "/app/inbox/:channelId"],
      signal,
      tokenSource: contentSource,
      onRoute: (res) => channelStore.setCurrentChannelId(res?.params.channelId),
      onMatch: () => drawer.updateRightDrawerAvailable(true),
      onUnmatch: () => drawer.updateRightDrawerAvailable(false),
      load: () => import("../../components/message-pane/messagePane"),
      context,
    }),
  ];

  createMiniProfileHandler({ signal });

  const handleResize = () => {
    document.body.classList.toggle("mobileWidth", isMobileWidth());
    document.body.classList.toggle("desktopWidth", !isMobileWidth());
  };
  handleResize();
  window.addEventListener("resize", handleResize, { signal });
  handleDangerLink(signal);

  const destroy = () => {
    abortController.abort();
    socket.disconnect();
    serverSidebar.destroy();
    appHeader?.destroy();
    appHeader = undefined;
    routes.forEach((route) => route.destroy());
    drawer.destroy();
  };

  return { render: () => {}, destroy };
};

export default createAppPage;
