import type { RawServer } from "../Types";

export const serverStore = createServerStore();

class Server {
  id: string;
  name: string;
  hexColor: string;
  constructor(data: RawServer) {
    this.id = data.id;
    this.name = data.name;
    this.hexColor = data.hexColor;
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
