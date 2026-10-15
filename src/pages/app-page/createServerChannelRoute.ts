import { createServerChannelDrawer } from "../../components/drawer-left/serverChannelDrawer";
import { createRightDrawer } from "../../components/drawer-right/RightDrawer";
import { Drawer } from "../../components/ui/drawer";
import { channelStore } from "../../store/channelStore";
import { serverStore } from "../../store/serverStore";
import { storeEmitter } from "../../utils/EventEmitter";
import type { RouteContext } from "./AppPage";

const createServerChannelRoute = ({ leftDrawer }: RouteContext) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const serverChannelDrawer = createServerChannelDrawer();
  const rightDrawer = createRightDrawer();
  const drawer = Drawer();

  leftDrawer.replaceChildren(serverChannelDrawer.render());

  drawer.rightDrawer.replaceChildren(rightDrawer.render());

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
    rightDrawer.destroy();
  };

  return { destroy };
};

export default createServerChannelRoute;
