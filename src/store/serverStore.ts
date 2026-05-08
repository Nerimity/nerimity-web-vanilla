import { ChannelType, type RawServer } from "../Types";
import { storeEmitter } from "../utils/EventEmitter";
import { ManualMemo } from "../utils/memo";
import { Channel, channelStore } from "./channelStore";
import type { ServerMember } from "./serverMemberStore";
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
    serverStore.currentServerSortedRoles.rerun();
    currentChannelsSorted.rerun();
    storeEmitter.emit("navigate:serverId", newId);
  };

  const currentChannelsSorted = new ManualMemo(() => {
    if (!currentServerId) return null;

    const currentChannels = [...channelStore.channels.values()]
      .filter((channel) => channel.serverId === currentServerId)
      .sort((a, b) => a.order! - b.order!);

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

  return {
    servers,
    setServers,
    get currentServerId() {
      return currentServerId;
    },
    memberTopColor,
    setCurrentServerId,
    currentChannelsSorted,
    currentServerSortedRoles,
  };
}
