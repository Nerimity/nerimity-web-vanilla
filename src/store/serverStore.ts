import { socket } from "../services/socket";
import { ChannelType, NotificationMode, type RawServer } from "../Types";
import { hasBit } from "../utils/bitwise";
import { ChannelPermissionFlag } from "../utils/channelPermissionFlag";
import { debounce } from "../utils/debounce";
import { storeEmitter } from "../utils/EventEmitter";
import { ManualMemo } from "../utils/memo";
import { RolePermissionFlag } from "../utils/RolePermissionFlag";
import { accountStore } from "./accountStore";
import { Channel, channelStore } from "./channelStore";
import { serverMemberStore, type ServerMember } from "./serverMemberStore";
import { ServerRole, serverRoleStore } from "./serverRoleStore";

export const serverStore = createServerStore();

export class Server {
  id: string;
  name: string;
  hexColor: string;
  avatar?: string;
  defaultChannelId: string;
  defaultRoleId: string;
  createdById: string;
  /**
   * @description if true, server members are not loaded yet.
   */
  lazy = true;
  constructor(data: RawServer) {
    this.id = data.id;
    this.name = data.name;
    this.hexColor = data.hexColor;
    this.avatar = data.avatar;
    this.defaultChannelId = data.defaultChannelId;
    this.defaultRoleId = data.defaultRoleId;
    this.createdById = data.createdById;
  }
}

function createServerStore() {
  let currentServerId: string | null = null;
  const servers = new Map<string, Server>();
  const lastSeenChannelIds = new Map<string, number>();

  const setServers = (newServers: RawServer[], notLazyServerId?: string) => {
    servers.clear();
    for (let i = 0; i < newServers.length; i++) {
      const server = newServers[i]!;
      servers.set(server.id, new Server(server));
    }

    if (notLazyServerId) {
      const server = servers.get(notLazyServerId);
      if (server) server.lazy = false;
    }
  };

  const setLastSeenChannelIds = (data: Record<string, number>) => {
    lastSeenChannelIds.clear();
    for (const [id, lastSeenAt] of Object.entries(data)) {
      lastSeenChannelIds.set(id, lastSeenAt);
    }
  };

  const updateLastSeenServerChannel = (channelId: string) => {
    const channel = channelStore.channels.get(channelId);
    lastSeenChannelIds.set(
      channelId,
      (channel?.lastMessagedAt || Date.now()) + 100,
    );
    delete channelStore.notificationsMemo.value()[channelId];
    serverStore.notificationsMemo.rerun();
    storeEmitter.emit("channel:notify_update", { channelId });
  };

  const setCurrentServerId = (id?: string) => {
    let newId = id ?? null;
    if (newId === currentServerId) return;
    currentServerId = newId;
    serverStore.currentServerSortedRoles.rerun();
    currentChannelsSorted.rerun();
    storeEmitter.emit("navigate:serverId", newId);
    fetchMembers();
  };

  const fetchMembers = debounce(() => {
    const server = servers.get(currentServerId!);
    if (!server) return;
    if (!server.lazy) return;
    server.lazy = false;
    socket.requestServerMembers(currentServerId!);
  }, 1000);

  const currentChannelsSorted = new ManualMemo(() => {
    if (!currentServerId) return null;

    const currentUserId = accountStore.currentUser?.id;
    const member = serverMemberStore.serverMembers
      .get(currentServerId!)
      ?.get(currentUserId!);

    const isAdmin = serverMemberStore.hasPermission(
      serverStore.currentServerId!,
      currentUserId!,
      RolePermissionFlag.admin.bit,
    );

    const server = servers.get(currentServerId!);
    const defaultRoleId = server?.defaultRoleId;
    const publicChannelBit = ChannelPermissionFlag.publicChannel.bit;
    const memberRoleIds = member ? new Set(member.roleIds) : null;

    const isPrivateChannel = (channel: Channel) => {
      if (!channel.permissions) return false;
      const perm = channel.permissions.find((p) => p.roleId === defaultRoleId);
      return perm ? !hasBit(perm.permissions, publicChannelBit) : false;
    };

    const hasRolePermission = (channel: Channel) => {
      if (!channel.permissions || !memberRoleIds) return false;
      for (const permission of channel.permissions) {
        if (!memberRoleIds.has(permission.roleId!)) continue;
        if (hasBit(permission.permissions, publicChannelBit)) return true;
      }
      return false;
    };

    const currentChannels: Channel[] = [];
    for (const channel of channelStore.channels.values()) {
      if (channel.serverId !== currentServerId) continue;
      if (isAdmin || !isPrivateChannel(channel) || hasRolePermission(channel)) {
        currentChannels.push(channel);
      }
    }
    currentChannels.sort((a, b) => a.order! - b.order!);

    const byCategory = new Map<string, Channel[]>();
    for (const channel of currentChannels) {
      if (channel.categoryId) {
        const group = byCategory.get(channel.categoryId);
        if (group) group.push(channel);
        else byCategory.set(channel.categoryId, [channel]);
      }
    }

    const results: Channel[] = [];
    for (const channel of currentChannels) {
      if (channel.categoryId) continue;
      results.push(channel);
      if (channel.type === ChannelType.CATEGORY) {
        const children = byCategory.get(channel.id);
        if (children) results.push(...children);
      }
    }

    return results;
  });

  const currentServerSortedRoles = new ManualMemo(() => {
    const serverRoles =
      serverRoleStore.roles.get(currentServerId!) ||
      new Map<string, ServerRole>();

    return [...serverRoles.values()].sort((a, b) => b.order - a.order);
  });

  const memberTopColor = (member?: ServerMember) => {
    if (!member) return;
    const role = currentServerSortedRoles
      .value()
      .find((r) => member.roleIds.includes(r.id) && r.hexColor);
    return role?.hexColor;
  };

  const memberTopColorAndIcon = (member?: ServerMember) => {
    if (!member) return;
    let color: string | undefined = undefined;
    let icon: string | undefined = undefined;

    const currentRoles = currentServerSortedRoles.value();
    for (let i = 0; i < currentRoles.length; i++) {
      const role = currentRoles[i]!;
      if (!member.roleIds.includes(role.id)) continue;

      if (!color && role.hexColor) color = role.hexColor;
      if (!icon && role.icon) icon = role.icon;

      if (color && icon) break;
    }

    return { color, icon };
  };

  const notificationsMemo = new ManualMemo(() => {
    const result: Record<string, number> = {};

    const channelNotifs = channelStore.notificationsMemo.value();

    for (const [id, count] of Object.entries(channelNotifs)) {
      const channel = channelStore.channels.get(id);
      if (!channel?.serverId) continue;

      const isMention = count > 0;

      const notification = accountStore.getCombinedNotification(
        channel.serverId,
        id,
      );
      const mentionsOnly =
        notification?.notificationPingMode === NotificationMode.MENTIONS_ONLY;
      const muted =
        notification?.notificationPingMode === NotificationMode.MUTE;

      if (muted) continue;
      if (!isMention && mentionsOnly) continue;

      const serverId = channel!.serverId!;
      const current = result[serverId] ?? 0;
      if (count > 0) {
        result[serverId] = (current < 0 ? 0 : current) + count;
      } else if (count == -1 && current == 0) {
        result[serverId] = -1;
      }
    }

    return result;
  });

  return {
    servers,
    setServers,
    get currentServerId() {
      return currentServerId;
    },
    notificationsMemo,
    setLastSeenChannelIds,
    lastSeenChannelIds,
    memberTopColor,
    setCurrentServerId,
    currentChannelsSorted,
    currentServerSortedRoles,
    updateLastSeenServerChannel,
    memberTopColorAndIcon,
  };
}
