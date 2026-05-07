import type { RawServerMember } from "../Types";
import { userStore } from "./userStore";

export const serverMemberStore = createServerMemberStore();

export class ServerMember {
  id: string;
  userId: string;
  roleIds: string[];
  serverId: string;
  nickname?: string;
  constructor(data: RawServerMember) {
    this.id = data.id;
    this.roleIds = data.roleIds;
    this.serverId = data.serverId;
    this.userId = data.userId;
    this.nickname = data.nickname;
  }
}

function createServerMemberStore() {
  const serverMembers = new Map<string, Map<string, ServerMember>>();

  const setServerMembers = (newMembers: RawServerMember[]) => {
    serverMembers.clear();
    for (let i = 0; i < newMembers.length; i++) {
      const member = newMembers[i]!;
      const members =
        serverMembers.get(member.serverId) ||
        new Map<string, RawServerMember>();
      userStore.addUser(member.user);
      members.set(member.id, new ServerMember(member));
      serverMembers.set(member.serverId, members);
    }
  };

  return { serverMembers, setServerMembers };
}
