import type { RawServer } from "../Types";
import { storeEmitter } from "../utils/EventEmitter";

export const serverStore = createServerStore();

export class Server {
  id: string;
  name: string;
  hexColor: string;
  avatar?: string;
  defaultChannelId: string;
  constructor(data: RawServer) {
    this.id = data.id;
    this.name = data.name;
    this.hexColor = data.hexColor;
    this.avatar = data.avatar;
    this.defaultChannelId = data.defaultChannelId;
  }
}

function createServerStore() {
  let currentServerId: string | null = null;
  const servers = new Map<string, Server>();

  const setServers = (newServers: RawServer[]) => {
    servers.clear();
    for (let i = 0; i < newServers.length; i++) {
      const server = newServers[i]!;
      servers.set(server.id, new Server(server));
    }
  };

  const setCurrentServerId = (id?: string) => {
    let newId = id ?? null;
    if (newId === currentServerId) return;
    currentServerId = newId;
    storeEmitter.emit("navigate:serverId", newId);
  };

  return {
    servers,
    setServers,
    get currentServerId() {
      return currentServerId;
    },
    setCurrentServerId,
  };
}
