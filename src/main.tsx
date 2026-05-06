import { h } from "./h";
import "./style.css";
import { socket } from "./services/socket";
import { router } from "./utils/router";
import { createSidebar } from "./components/sidebar";
import { serverStore } from "./store/serverStore";
import { channelStore } from "./store/channelStore";
import { createServerChannelList } from "./components/serverChannelList";
import { storeEmitter } from "./utils/EventEmitter";

socket.connect();

const App = () => {
  const app = document.getElementById("app")!;
  let serverSidebar: ReturnType<typeof createSidebar> | null = null;
  let serverChannelList: ReturnType<typeof createServerChannelList> | null =
    null;

  storeEmitter.on("user:authenticated", () => {
    serverStore.currentChannels.rerun();
  });

  router.match(
    ["/app/servers/:serverId/:channelId"],
    (params) => {
      serverStore.setCurrentServerId(params.serverId);
      channelStore.setCurrentChannelId(params.channelId);
      console.log(params);
    },
    { trackParams: true },
  );

  router.match(["/app/*", "/app"], (_, pathname) => {
    if (pathname.startsWith("/app")) {
      serverSidebar ??= createSidebar();
      serverChannelList ??= createServerChannelList();
      app.replaceChildren(serverSidebar.render(), serverChannelList.render());
      return;
    }
    serverSidebar?.destroy();
    serverSidebar = null;
    serverChannelList?.destroy();
    serverChannelList = null;
    app.replaceChildren(
      <a data-route href="/app">
        App
      </a>,
    );
  });
};

App();
