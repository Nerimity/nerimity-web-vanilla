import type { RawServerMember } from "../Types";
import { storeEmitter } from "../utils/EventEmitter";
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

  const setServerMembers = (
    newMembers: RawServerMember[],
    serverId?: string,
  ) => {
    if (serverId) {
      const members = new Map<string, ServerMember>();
      for (let i = 0; i < newMembers.length; i++) {
        const member = newMembers[i]!;
        if (member.serverId === serverId) {
          userStore.addUser(member.user);
          members.set(member.userId, new ServerMember(member));
        }
      }
      serverMembers.set(serverId, members);
      storeEmitter.emit("server:members_fetched", { serverId });
      return;
    }

    serverMembers.clear();
    for (let i = 0; i < newMembers.length; i++) {
      const member = newMembers[i]!;
      const members =
        serverMembers.get(member.serverId) ||
        new Map<string, RawServerMember>();
      userStore.addUser(member.user);
      members.set(member.userId, new ServerMember(member));
      serverMembers.set(member.serverId, members);
    }
  };

  return { serverMembers, setServerMembers };
}
