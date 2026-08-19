import { Drawer } from "../../components/drawer";
import { createRightDrawer } from "../../components/right-drawer/RightDrawer";
import { createServerChannelList } from "../../components/serverChannelList";
import { serverStore } from "../../store/serverStore";
import { storeEmitter } from "../../utils/EventEmitter";

export const createServerChannelRoute = (leftDrawer: HTMLElement) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const serverChannelList = createServerChannelList();
  const rightDrawer = createRightDrawer();
  const drawer = Drawer();

  leftDrawer.replaceChildren(serverChannelList.render());

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
    abortController.abort();
    serverChannelList.destroy();
    rightDrawer.destroy();
  };

  return { destroy };
};
