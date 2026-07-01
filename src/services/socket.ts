import { wsUrl } from "../config";
import { accountStore } from "../store/accountStore";
import { serverStore } from "../store/serverStore";
import { getLocalItem } from "../utils/localStorage";
import { socketEventHandler } from "./socketEvents";

interface ClientEvents {
  "notification:dismiss": { channelId: string };
  "user:request_server_members": { serverId: string };
  "user:authenticate": {
    token: string;
    currentServerId?: string | null;
    compression: "zstd";
    partial: boolean;
  };
}

export const socket = createSocket();

const PING_TIMEOUT_MS = 45_000;
const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 15_000;

function createSocket() {
  let ws: WebSocket | null = null;
  let socketId: string = "";
  let binaryEventName: string | null = null;

  let pingTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;
  let manuallyDisconnected = false;
  let listenersAttached = false;

  const clearPingTimeout = () => {
    if (pingTimeoutTimer) clearTimeout(pingTimeoutTimer);
    pingTimeoutTimer = null;
  };

  const resetPingTimeout = () => {
    clearPingTimeout();
    pingTimeoutTimer = setTimeout(() => {
      ws?.close();
    }, PING_TIMEOUT_MS);
  };

  const scheduleReconnect = (immediate = false) => {
    if (manuallyDisconnected) return;
    if (reconnectTimer) clearTimeout(reconnectTimer);

    const delay = immediate
      ? 0
      : Math.min(
          RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempts,
          RECONNECT_MAX_DELAY_MS,
        );
    reconnectAttempts++;

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  };

  const handleBrowserOffline = () => {
    ws?.close();
  };

  // Spams the server when internet is unstable.
  const handleBrowserOnline = () => {
    // if (manuallyDisconnected) return;
    // if (!ws || ws.readyState === WebSocket.CLOSED) {
    //   scheduleReconnect(true);
    // }
  };

  const attachBrowserListeners = () => {
    if (listenersAttached) return;
    window.addEventListener("offline", handleBrowserOffline);
    window.addEventListener("online", handleBrowserOnline);
    listenersAttached = true;
  };

  const detachBrowserListeners = () => {
    if (!listenersAttached) return;
    window.removeEventListener("offline", handleBrowserOffline);
    window.removeEventListener("online", handleBrowserOnline);
    listenersAttached = false;
  };

  const connect = () => {
    manuallyDisconnected = false;
    attachBrowserListeners();

    if (ws) {
      ws.onmessage = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.close();
    }
    clearPingTimeout();

    ws = new WebSocket(wsUrl);

    ws.onmessage = async (event) => {
      if (event.data instanceof Blob) {
        if (!binaryEventName) return;
        socketEventHandler(binaryEventName, await event.data.arrayBuffer());
        binaryEventName = null;
        return;
      }

      const raw = event.data as string;
      if (raw === "2") {
        resetPingTimeout();
        ws?.send("3");
        return;
      }
      if (raw[0] === "0") {
        resetPingTimeout();
        ws?.send("40");
        return;
      }
      if (raw.startsWith("40")) {
        const data = JSON.parse(raw.slice(2));
        socketId = data.sid;
        reconnectAttempts = 0;
        accountStore.setConnected(true);

        emit("user:authenticate", {
          token: getLocalItem("userToken")!,
          compression: "zstd",
          partial: true,
          currentServerId: serverStore.currentServerId,
        });
        return;
      }
      if (raw.startsWith("42")) {
        const [event, data] = JSON.parse(raw.slice(2));
        socketEventHandler(event, data);
        return;
      }

      if (raw.startsWith("451-")) {
        const [event] = JSON.parse(raw.slice(4));
        binaryEventName = event;
        return;
      }

      if (raw.startsWith("41")) {
        manuallyDisconnected = true;
        clearPingTimeout();
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = null;

        accountStore.setAuthenticated(false);
        accountStore.setConnected(false);

        ws?.close();
        return;
      }
    };

    ws.onclose = () => {
      clearPingTimeout();
      accountStore.setAuthenticated(false);
      accountStore.setConnected(false);
      scheduleReconnect();
    };

    ws.onerror = () => {};
  };

  const emit = <T extends keyof ClientEvents>(
    event: T,
    payload: ClientEvents[T],
  ) => {
    ws?.send(`42${JSON.stringify([event, payload])}`);
  };

  const disconnect = () => {
    manuallyDisconnected = true;
    detachBrowserListeners();
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    clearPingTimeout();
    accountStore.setAuthenticated(false);
    accountStore.setConnected(false);
    ws?.close();
  };

  const requestServerMembers = (serverId: string) => {
    emit("user:request_server_members", { serverId });
  };
  const dismissNotification = (channelId: string) => {
    emit("notification:dismiss", { channelId });
  };

  return {
    disconnect,
    connect,
    requestServerMembers,
    dismissNotification,
    get socketId() {
      return socketId;
    },
  };
}
