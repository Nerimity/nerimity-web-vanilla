import type { RawServerMember } from "../Types";
import { hasBit } from "../utils/bitwise";
import { storeEmitter } from "../utils/EventEmitter";
import { patchProperty } from "../utils/object";
import { accountStore } from "./accountStore";
import { channelStore } from "./channelStore";
import { serverRoleStore } from "./serverRoleStore";
import { serverStore } from "./serverStore";
import { userStore } from "./userStore";

export const serverMemberStore = createServerMemberStore();

export class ServerMember {
  id: string;
  userId: string;
  roleIds: string[];
  serverId: string;
  nickname?: string;
  joinedAt: number;
  muteExpireAt?: number;
  constructor(data: RawServerMember) {
    this.id = data.id;
    this.roleIds = data.roleIds;
    this.serverId = data.serverId;
    this.userId = data.userId;
    this.nickname = data.nickname;
    this.joinedAt = data.joinedAt;
    this.muteExpireAt = data.muteExpireAt;
  }
  hasPerm(perm: number) {
    return serverMemberStore.hasPermission(this.serverId, this.userId, perm);
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
        serverMembers.get(member.serverId) || new Map<string, ServerMember>();
      userStore.addUser(member.user);
      members.set(member.userId, new ServerMember(member));
      serverMembers.set(member.serverId, members);
    }
  };

  const updateMember = (
    serverId: string,
    userId: string,
    updated: Partial<ServerMember>,
  ) => {
    const members = serverMembers.get(serverId);
    if (!members) return;
    const member = members.get(userId);
    if (!member) return;

    patchProperty(member, updated, "roleIds");
    patchProperty(member, updated, "nickname");

    const isMe = accountStore.currentUser?.id === userId;

    if (isMe) {
      channelStore.notificationsMemo.rerun();
      serverStore.notificationsMemo.rerun();
      serverStore.currentChannelsSorted.rerun();
    }

    storeEmitter.emit("server:member_update", { serverId, userId, isMe });
  };

  const createPermChecker = (serverId: string, userId: string) => {
    const members = serverMembers.get(serverId);
    const member = members?.get(userId);
    const server = serverStore.servers.get(serverId);

    if (!members || !member || !server) {
      return { hasPermission: () => false, isOwner: false };
    }

    const isOwner = server.createdById === userId;

    let combinedPermissions = 0;

    const roles = serverRoleStore.roles.get(serverId);

    for (let i = 0; i < member.roleIds.length; i++) {
      const role = roles?.get(member.roleIds[i]!);
      if (role) combinedPermissions |= role.permissions;
    }

    const defaultRole = roles?.get(server.defaultRoleId!);
    if (defaultRole) combinedPermissions |= defaultRole.permissions;

    return {
      hasPermission: (permission: number) =>
        isOwner || hasBit(combinedPermissions, permission),
    };
  };
  const hasPermission = (
    serverId: string,
    userId: string,
    permission: number,
  ) => {
    const members = serverMembers.get(serverId);
    if (!members) return false;
    const member = members.get(userId);
    if (!member) return false;
    const server = serverStore.servers.get(serverId);
    if (!server) return false;

    if (server.createdById === userId) return true;

    for (let i = 0; i < member.roleIds.length; i++) {
      const roleId = member.roleIds[i]!;
      const role = serverRoleStore.roles.get(serverId)?.get(roleId);
      if (!role) continue;
      if (hasBit(role.permissions, permission)) return true;
    }

    const defaultRole = serverRoleStore.roles
      .get(serverId)
      ?.get(server.defaultRoleId!);
    if (!defaultRole) return false;
    return hasBit(defaultRole.permissions, permission);
  };

  const getMember = (serverId: string, userId: string) => {
    const members = serverMembers.get(serverId);
    if (!members) return;
    return members.get(userId);
  };

  const currentMember = (serverId: string) =>
    serverMemberStore.getMember(serverId, accountStore.currentUser?.id!);

  return {
    serverMembers,
    currentMember,
    setServerMembers,
    createPermChecker,
    hasPermission,
    getMember,
    updateMember,
  };
}
