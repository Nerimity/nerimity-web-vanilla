import { createAppHeader } from "../../components/appHeader";
import { createPostContextMenuHandler } from "../../components/context-menus/PostContextMenu";
import { createServerContextMenuHandler } from "../../components/context-menus/ServerContextMenu";
import { createUserContextMenuHandler } from "../../components/context-menus/UserContextMenu";
import { handleCustomTooltip } from "../../components/CustomTooltip";
import { handleDangerLink } from "../../components/markup/MarkupLink";
import { createMiniProfileHandler } from "../../components/miniProfile";
import {
  createPostModal,
  destroyPostModal,
} from "../../components/modals/createPostModal";
import { createBotInviteModalLazy } from "../../components/modals/LazyBotInviteModal";
import { createServerInviteModalLazy } from "../../components/modals/LazyServerInviteModal";
import { createSidebar } from "../../components/sidebar";
import { Drawer } from "../../components/ui/drawer";
import { isMobileWidth } from "../../config";
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
  shouldMatch?: (res: MatchResult<P> | null | undefined) => boolean;
  alwaysRemount?: boolean;
}) {
  let pane: T | null = null;

  router.createMatchListener<P>(
    opts.paths,
    async (res) => {
      if (!res) {
        pane?.destroy();
        pane = null;
        opts.onUnmatch?.();
        return;
      }

      if (opts.shouldMatch && !opts.shouldMatch(res)) {
        pane?.destroy();
        pane = null;
        opts.onUnmatch?.();
        return;
      }

      opts.onRoute?.(res);
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
  createServerContextMenuHandler({ signal });
  createPostContextMenuHandler({ signal });

  createPostContextMenuHandler({
    mode: "click",
    idSelector: `.postItemOuter`,
    signal: new AbortController().signal,
    selector: `.postItem [data-action="context"]`,
  });

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

  const clearCurrentServerIfLeavingServerContext = () => {
    const pathname = location.pathname;
    if (pathname.startsWith("/app/servers/")) return;
    serverStore.setCurrentServerId();
  };

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
      paths: ["/app", "/app/inbox/*", "/app/profile/*", "/app/explore{/*}?"],
      signal,
      tokenSource: appRouteSource,
      load: () => import("./createInboxChannelRoute"),
      context,
    }),
    registerPaneRoute({
      paths: "/app/explore{/*}?",
      signal,
      tokenSource: contentSource,
      load: () => import("./createExploreRoute"),
      context,
    }),

    registerPaneRoute<Page, { serverId: string }>({
      paths: "/app/servers/:serverId/settings{/*}?",
      signal,
      tokenSource: appRouteSource,
      load: () => import("./server-settings/createServerSettingsRoute"),
      onRoute: (res) => serverStore.setCurrentServerId(res?.params.serverId),
      onUnmatch: clearCurrentServerIfLeavingServerContext,
      context,
    }),
    registerPaneRoute<Page, { serverId: string; channelId: string }>({
      paths: "/app/servers/:serverId/:channelId",
      signal,
      tokenSource: appRouteSource,
      shouldMatch: (res) => res?.params.channelId !== "settings",
      onRoute: (res) => serverStore.setCurrentServerId(res?.params.serverId),
      onUnmatch: clearCurrentServerIfLeavingServerContext,
      load: () => import("./createServerChannelRoute"),
      context,
    }),
    registerPaneRoute<Page>({
      paths: "/app/settings{/*}?",
      signal,
      tokenSource: appRouteSource,
      load: () => import("./settings/createSettingsRoute"),
      context,
    }),

    registerPaneRoute<Page, { channelId: string }>({
      paths: ["/app/servers/:serverId/:channelId", "/app/inbox/:channelId"],
      signal,
      tokenSource: contentSource,
      shouldMatch: (res) => res?.params.channelId !== "settings",
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

  handleCustomTooltip({ signal: abortController.signal });
  handleResize();
  window.addEventListener("resize", handleResize, { signal });
  handleDangerLink(signal);

  handlePostPopup(signal);

  router.beforeNavigate((event) => {
    const postMatched = router.match<{ postId: string }>(
      `/p/:postId`,
      event.newPath,
    );

    if (postMatched) {
      router.setQuery("postId", postMatched.params.postId);
      return false;
    }
  }, signal);

  router.beforeNavigate((event) => {
    const postMatched = router.match<{ postId: string }>(
      `/p/:postId`,
      event.newPath,
    );

    if (postMatched) {
      router.setQuery("postId", postMatched.params.postId);
      return false;
    }

    const botInviteMatched = router.match<{ appId: string }, { perms: string }>(
      `/bot/:appId`,
      event.newPath,
    );

    if (botInviteMatched) {
      createBotInviteModalLazy({
        appId: botInviteMatched.params.appId!,
        perms: Number(botInviteMatched.query.perms) || 0,
      });
      return false;
    }

    const serverInviteMatched = router.match<{ code: string }>(
      `/i/:code`,
      event.newPath,
    );

    if (serverInviteMatched) {
      createServerInviteModalLazy({
        code: serverInviteMatched?.params.code!,
      });
      return false;
    }
  }, signal);

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

const handlePostPopup = (signal: AbortSignal) => {
  router.createQueryListener<{ postId: string }>(
    (params) => {
      const postId = params?.postId;
      destroyPostModal();

      if (postId) {
        createPostModal({ postId });
      }
    },
    {
      signal: signal,
    },
  );
};
