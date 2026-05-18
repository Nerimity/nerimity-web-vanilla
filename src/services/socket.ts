import { accountStore } from "../store/accountStore";
import { serverStore } from "../store/serverStore";
import { getLocalItem } from "../utils/localStorage";
import { socketEventHandler } from "./socketEvents";

export const socket = createSocket();

function createSocket() {
  let ws: WebSocket | null = null;
  let socketId: string = "";

  let binaryEventName: string | null = null;

  const connect = () => {
    if (ws) {
      ws.onmessage = null;
      ws.close();
    }
    ws = new WebSocket(
      "wss://nerimity.com/socket.io/?EIO=4&transport=websocket",
      // "ws://localhost:8000/socket.io/?EIO=4&transport=websocket",
    );
    ws.onmessage = async (event) => {
      if (event.data instanceof Blob) {
        if (!binaryEventName) return;
        socketEventHandler(binaryEventName, await event.data.arrayBuffer());
        binaryEventName = null;

        return;
      }

      const raw = event.data as string;
      if (raw === "2") {
        ws?.send("3");
        return;
      }
      if (raw[0] === "0") {
        ws?.send("40");
        return;
      }
      if (raw.startsWith("40")) {
        const data = JSON.parse(raw.slice(2));
        socketId = data.sid;
        accountStore.setConnected(true);

        emit("user:authenticate", {
          token: getLocalItem("userToken"),
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
    };
    ws.onclose = () => {
      disconnect();
    };
  };

  const emit = (event: string, payload: any) => {
    ws?.send(`42${JSON.stringify([event, payload])}`);
  };

  const disconnect = () => {
    accountStore.setAuthenticated(false);
    accountStore.setConnected(false);
    ws?.close();
  };

  const requestServerMembers = (serverId: string) => {
    emit("user:request_server_members", { serverId });
  };

  return {
    disconnect,
    connect,
    requestServerMembers,
    get socketId() {
      return socketId;
    },
  };
}
