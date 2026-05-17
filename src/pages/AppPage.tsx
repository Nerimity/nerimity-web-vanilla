import { css } from "@linaria/core";
import { createAppHeader } from "../components/appHeader";
import { Drawer } from "../components/drawer";
import { createMessagePane } from "../components/message-pane/messagePane";
import { createServerChannelList } from "../components/serverChannelList";
import { createServerMemberList } from "../components/serverMemberList";
import { createSidebar } from "../components/sidebar";
import { h } from "../h";
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
`;

export const createAppPage = () => {
  lazyLoadEmojis();
  const abortController = new AbortController();
  const { signal } = abortController;
  socket.connect();
  const app = document.getElementById("app")!;
  let messagePane: ReturnType<typeof createMessagePane> | null = null;
  let appHeader = createAppHeader();

  let contentEl = (<div class={content}></div>) as unknown as HTMLElement;

  app.replaceChildren(Drawer().render());

  router.match(
    ["/app/servers/:serverId/:channelId"],
    (params) => {
      if (!params.serverId || !params.channelId) {
        messagePane?.destroy();
        messagePane = null;
        return;
      }
      serverStore.setCurrentServerId(params.serverId);
      channelStore.setCurrentChannelId(params.channelId);

      if (messagePane) return;

      messagePane = createMessagePane();
      contentEl.replaceChildren(messagePane.render());
    },
    { signal },
  );

  storeEmitter.on(
    "user:authenticated",
    () => {
      serverStore.currentServerSortedRoles.rerun();
      serverStore.currentChannelsSorted.rerun();
    },
    signal,
  );

  router.match(
    ["/app/servers/:serverId/:channelId"],
    (params) => {
      serverStore.setCurrentServerId(params.serverId);
      channelStore.setCurrentChannelId(params.channelId);
    },
    { trackParams: true, signal },
  );

  let serverSidebar: ReturnType<typeof createSidebar> | null = null;
  let serverChannelList: ReturnType<typeof createServerChannelList> | null =
    null;
  let serverMemberList: ReturnType<typeof createServerMemberList> | null = null;

  const destroy = () => {
    abortController.abort();
    appHeader.destroy();
    socket.disconnect();
    messagePane?.destroy();
    serverSidebar?.destroy();
    serverChannelList?.destroy();
    serverMemberList?.destroy();
    serverSidebar = null;
    serverChannelList = null;
    serverMemberList = null;
    Drawer().destroy();
    contentEl.remove();
  };

  const render = () => {
    serverSidebar ??= createSidebar();
    serverChannelList ??= createServerChannelList();
    serverMemberList ??= createServerMemberList();
    const drawer = Drawer();

    drawer.leftDrawer.replaceChildren(
      serverSidebar.render(),
      serverChannelList.render(),
    );
    drawer.content.replaceChildren(appHeader.render(), contentEl);

    drawer.rightDrawer.replaceChildren(serverMemberList.render());
  };

  return { render, destroy };
};
