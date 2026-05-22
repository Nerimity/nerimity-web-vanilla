import { Drawer } from "../../components/drawer";
import { createMessagePane } from "../../components/message-pane/messagePane";
import { createServerChannelList } from "../../components/serverChannelList";
import { createServerMemberList } from "../../components/serverMemberList";
import { serverStore } from "../../store/serverStore";
import { storeEmitter } from "../../utils/EventEmitter";

const createServerChannelRoute = (
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

export default createServerChannelRoute;
