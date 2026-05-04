import type { RawServerMember } from "../Types";

export const serverMemberStore = createServerMemberStore();

class ServerMember {
  id: string;
  userId: string;
  roleIds: string[];
  serverId: string;
  constructor(data: RawServerMember) {
    this.id = data.id;
    this.roleIds = data.roleIds;
    this.serverId = data.serverId;
    this.userId = data.userId;
  }
}

function createServerMemberStore() {
  const serverMembers = new Map<string, Map<string, ServerMember>>();

  const setServerMembers = (newServers: RawServerMember[]) => {
    serverMembers.clear();
    for (let i = 0; i < newServers.length; i++) {
      const server = newServers[i]!;
      const members =
        serverMembers.get(server.serverId) ||
        new Map<string, RawServerMember>();
      members.set(server.id, new ServerMember(server));
      serverMembers.set(server.serverId, members);
    }
  };

  return { serverMembers, setServerMembers };
}
