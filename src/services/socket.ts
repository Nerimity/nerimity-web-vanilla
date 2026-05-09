import { socketEventHandler } from "./socketEvents";

export const socket = createSocket();

function createSocket() {
  let ws: WebSocket | null = null;

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
      if (raw[0] === "2") {
        ws?.send("3");
      }
      if (raw[0] === "0") {
        ws?.send("40");
        return;
      }
      if (raw[0] === "4" && raw[1] === "0") {
        emit("user:authenticate", {
          token: localStorage["userToken"],
          compression: "zstd",
        });
        return;
      }
      if (raw[0] === "4" && raw[1] === "2") {
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
  };

  const emit = (event: string, payload: any) => {
    ws?.send(`42${JSON.stringify([event, payload])}`);
  };

  return { connect };
}
