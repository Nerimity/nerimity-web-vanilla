import { createServerChannelDrawer } from "../../components/drawer-left/serverChannelDrawer";
import { channelStore } from "../../store/channelStore";
import { serverStore } from "../../store/serverStore";
import { storeEmitter } from "../../utils/EventEmitter";
import type { RouteContext } from "./AppPage";

const createServerChannelRoute = ({ leftDrawer }: RouteContext) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const serverChannelDrawer = createServerChannelDrawer();

  leftDrawer.replaceChildren(serverChannelDrawer.render());

  serverStore.currentServerSortedRoles.rerun();
  serverStore.currentChannelsSorted.rerun();
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
    channelStore.setCurrentChannelId();
    abortController.abort();
    serverChannelDrawer.destroy();
  };

  return { destroy };
};

export default createServerChannelRoute;
