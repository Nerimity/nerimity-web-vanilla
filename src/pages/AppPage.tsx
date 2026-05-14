import { createMessagePane } from "../components/message-pane/messagePane";
import { createServerChannelList } from "../components/serverChannelList";
import { createServerMemberList } from "../components/serverMemberList";
import { createSidebar } from "../components/sidebar";
import { h } from "../h";
import { socket } from "../services/socket";
import { channelStore } from "../store/channelStore";
import { serverStore } from "../store/serverStore";
import { storeEmitter } from "../utils/EventEmitter";
import { router } from "../utils/router";

export const createAppPage = () => {
  socket.connect();
  const app = document.getElementById("app")!;
  let messagePane: ReturnType<typeof createMessagePane> | null = null;

  const contentPane = (
    <div class="contentPane"></div>
  ) as unknown as HTMLDivElement;

  const serverChannelMatchUnsub = router.match(
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
      contentPane.replaceChildren(messagePane.render());
    },
  );

  const authenticatedUnsub = storeEmitter.on("user:authenticated", () => {
    serverStore.currentServerSortedRoles.rerun();
    serverStore.currentChannelsSorted.rerun();
  });

  const routeMatchUnsub = router.match(
    ["/app/servers/:serverId/:channelId"],
    (params) => {
      serverStore.setCurrentServerId(params.serverId);
      channelStore.setCurrentChannelId(params.channelId);
    },
    { trackParams: true },
  );

  let serverSidebar: ReturnType<typeof createSidebar> | null = null;
  let serverChannelList: ReturnType<typeof createServerChannelList> | null =
    null;
  let serverMemberList: ReturnType<typeof createServerMemberList> | null = null;

  const destroy = () => {
    socket.disconnect();
    messagePane?.destroy();
    serverSidebar?.destroy();
    serverChannelList?.destroy();
    serverMemberList?.destroy();
    serverSidebar = null;
    serverChannelList = null;
    serverMemberList = null;
    contentPane.remove();
    authenticatedUnsub();
    routeMatchUnsub();
    serverChannelMatchUnsub();
  };

  const render = () => {
    serverSidebar ??= createSidebar();
    serverChannelList ??= createServerChannelList();
    serverMemberList ??= createServerMemberList();
    app.replaceChildren(
      serverSidebar.render(),
      serverChannelList.render(),
      contentPane,
      serverMemberList.render(),
    );
  };

  return { render, destroy };
};
