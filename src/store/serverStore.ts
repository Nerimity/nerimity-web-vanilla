import type { RawServer } from "../Types";

export const serverStore = createServerStore();

export class Server {
  id: string;
  name: string;
  hexColor: string;
  avatar?: string;
  constructor(data: RawServer) {
    this.id = data.id;
    this.name = data.name;
    this.hexColor = data.hexColor;
    this.avatar = data.avatar;
  }
}

function createServerStore() {
  const servers = new Map<string, Server>();

  const setServers = (newServers: RawServer[]) => {
    servers.clear();
    for (let i = 0; i < newServers.length; i++) {
      const server = newServers[i]!;
      servers.set(server.id, new Server(server));
    }
  };

  return { servers, setServers };
}
