import { socketEventHandler } from "./socketEvents";

export const socket = createSocket();

function createSocket() {
  let ws: WebSocket | null = null;

  const connect = () => {
    if (ws) {
      ws.onmessage = null;
      ws.close();
    }
    ws = new WebSocket(
      "wss://nerimity.com/socket.io/?EIO=4&transport=websocket",
    );
    ws.onmessage = (event) => {
      const raw = event.data as string;
      if (raw[0] === "2") {
        ws?.send("3");
      }
      if (raw[0] === "0") {
        ws?.send("40");
        return;
      }
      if (raw[0] === "4" && raw[1] === "0") {
        emit("user:authenticate", { token: localStorage["userToken"] });
        return;
      }
      if (raw[0] === "4" && raw[1] === "2") {
        const [event, data] = JSON.parse(raw.slice(2));
        socketEventHandler(event, data);
      }
    };
  };

  const emit = (event: string, payload: any) => {
    ws?.send(`42${JSON.stringify([event, payload])}`);
  };

  return { connect };
}
