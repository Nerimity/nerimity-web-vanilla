import { socket } from "../services/socket";
import {
  ChannelType,
  NotificationMode,
  type ChannelPermissions,
  type RawChannel,
} from "../Types";
import { storeEmitter } from "../utils/EventEmitter";
import { ManualMemo } from "../utils/memo";
import { accountStore } from "./accountStore";
import { messageMentionStore } from "./messageMentionStore";
import type { Message } from "./messageStore";
import { serverMemberStore } from "./serverMemberStore";

import { serverStore } from "./serverStore";

export const channelStore = createChannelStore();

export class Channel {
  id: string;
  name?: string;
  serverId?: string;
  order?: number;
  type: ChannelType;
  categoryId?: string;
  icon?: string;
  permissions?: ChannelPermissions[];
  lastMessagedAt?: number;
  constructor(data: RawChannel) {
    this.id = data.id;
    this.name = data.name;
    this.serverId = data.serverId;
    this.order = data.order;
    this.type = data.type;
    this.categoryId = data.categoryId;
    this.icon = data.icon;
    this.permissions = data.permissions;
    this.lastMessagedAt = data.lastMessagedAt;
  }
}

interface ChannelProperty {
  content: string;
  canLoadTop: boolean;
  canLoadBottom: boolean;
  loading: boolean;
  scrollTop?: number;
  editingMessage?: Message;
  replyingMessages?: Message[];
}

function createChannelStore() {
  let currentChannelId: string | null = null;
  const channels = new Map<string, Channel>();
  const properties = new Map<string, ChannelProperty>();

  const getProperty = (channelId: string, create = true) => {
    const property = properties.get(channelId);
    if (property) return property;
    if (!create) return null;
    const newProperty: ChannelProperty = {
      content: "",
      canLoadTop: false,
      loading: false,
      canLoadBottom: false,
    };
    properties.set(channelId, newProperty);
    return newProperty;
  };

  const deleteChannel = (channelId: string, serverId?: string) => {
    const notifications = hasNotification(channels.get(channelId)!);
    channels.delete(channelId);
    if (notifications) {
      delete notificationsMemo.value()[channelId];
      if (serverId) {
        serverStore.notificationsMemo.rerun();
      }
    }
    serverStore.currentChannelsSorted.rerun();
    storeEmitter.emit("channel:notify_update", { channelId, serverId });
  };

  const updatePermissions = (payload: {
    permissions: 0;
    roleId: string;
    serverId: string;
    channelId: string;
  }) => {
    const server = serverStore.servers.get(payload.serverId);
    if (!server) return;
    const channel = channels.get(payload.channelId);
    if (!channel) return;
    const defaultRole = server.defaultRoleId === payload.roleId;

    const member = serverMemberStore.serverMembers
      .get(payload.serverId!)
      ?.get(accountStore.currentUser!.id);

    const hasRole = defaultRole || member?.roleIds.includes(payload.roleId);

    if (!defaultRole && payload.permissions === 0) {
      channel.permissions = channel.permissions?.filter(
        (perm) => perm.roleId !== payload.roleId,
      );
    }
    const perm = channel.permissions?.find(
      (perm) => perm.roleId === payload.roleId,
    );
    if (perm) {
      perm.permissions = payload.permissions;
    } else {
      channel.permissions?.push({
        roleId: payload.roleId,
        permissions: payload.permissions,
      });
    }

    if (hasRole) {
      notificationsMemo.rerun();
      serverStore.notificationsMemo.rerun();
      serverStore.currentChannelsSorted.rerun();
      storeEmitter.emit("channel:notify_update", {
        channelId: payload.channelId,
        serverId: payload.serverId,
      });
    }
  };

  const currentChannelProperty = () => getProperty(currentChannelId!);

  const setEditingMessage = (channelId: string, message?: Message) => {
    const property = getProperty(channelId, false);
    const prevMessage = property?.editingMessage;
    if (prevMessage === message) return;
    setProperty(channelId, {
      editingMessage: message,
      ...(message ? { content: message?.content || "" } : {}),
    });

    if (property?.replyingMessages?.length) {
      setProperty(channelId, { replyingMessages: [] });
      storeEmitter.emit("message_property:replying", { replies: [] });
    }

    storeEmitter.emit("message_property:editing", { message, prevMessage });
  };

  const addReply = (channelId: string, message?: Message) => {
    const property = getProperty(channelId, false);
    if (!property) return;
    const replies = property.replyingMessages || [];
    if (replies.length >= 5) return;
    if (replies.includes(message!)) return;
    if (property.editingMessage) {
      setProperty(channelId, { editingMessage: undefined });
      storeEmitter.emit("message_property:editing", { message: undefined });
    }
    replies.push(message!);
    setProperty(channelId, { replyingMessages: replies });
    storeEmitter.emit("message_property:replying", { replies });
  };

  const removeReply = (channelId: string, messageId?: string) => {
    const property = getProperty(channelId, false);
    if (!property) return;
    let replies = property.replyingMessages;
    if (!replies) return;
    if (messageId) {
      const index = replies.findIndex((m) => m.id === messageId);
      if (index === -1) return;
      replies.splice(index, 1);
    } else {
      replies = [];
    }
    setProperty(channelId, { replyingMessages: replies });
    storeEmitter.emit("message_property:replying", { replies });
  };

  const setProperty = (
    channelId: string,
    property: Partial<ChannelProperty>,
  ) => {
    properties.set(channelId, { ...getProperty(channelId)!, ...property });
  };

  const setChannels = (newChannels: RawChannel[]) => {
    channels.clear();
    for (let i = 0; i < newChannels.length; i++) {
      const channel = newChannels[i]!;
      channels.set(channel.id, new Channel(channel));
    }
  };

  const setChannel = (channel: RawChannel) => {
    channels.set(channel.id, new Channel(channel));
    if (channel.serverId) {
      if (channel.type !== ChannelType.CATEGORY) {
        addNotification(channel.id, channel.serverId);
      }
      if (channel.serverId === serverStore.currentServerId) {
        serverStore.currentChannelsSorted.rerun();
      }
    }
  };

  const addNotification = (channelId: string, serverId: string) => {
    const isMuted =
      accountStore.notificationSettings.get(channelId)?.notificationPingMode !==
      NotificationMode.MUTE;

    if (!notificationsMemo.value()[channelId]) {
      notificationsMemo.value()[channelId] = -1;
    }

    if (isMuted) {
      if (!serverStore.notificationsMemo.value()[serverId]) {
        serverStore.notificationsMemo.value()[serverId] = -1;
      }
    }
    storeEmitter.emit("channel:notify_update", {
      channelId: channelId,
      serverId,
    });
  };

  const setCurrentChannelId = (id?: string) => {
    let newId = id ?? null;
    if (newId === currentChannelId) return;
    currentChannelId = newId;
    storeEmitter.emit("navigate:channelId", newId);
  };

  const hasNotification = (channel: Channel) => {
    const mentions = messageMentionStore.mentions;
    const lastSeen = serverStore.lastSeenChannelIds;
    const notifySettings = accountStore.notificationSettings.get(channel.id);

    const muted =
      notifySettings?.notificationPingMode === NotificationMode.MUTE;
    const mentionsOnly =
      notifySettings?.notificationPingMode === NotificationMode.MENTIONS_ONLY;
    if (muted) return false;

    const mentionCount = mentions.get(channel.id)?.count;
    if (mentionCount && mentionCount > 0) {
      return mentionCount;
    }
    if (mentionsOnly) return false;
    if (!channel.serverId) return false;
    const lastMessagedAt = channel.lastMessagedAt! || 0;

    const lastSeenAt = lastSeen.get(channel.id) || 0;

    const hasNotSeen = !lastSeenAt || lastMessagedAt! > lastSeenAt;

    if (hasNotSeen) {
      return -1;
    }
    return false;
  };

  const notificationsMemo = new ManualMemo(() => {
    const notifications: Record<string, number> = {};

    for (const channel of channels.values()) {
      if (channel.type !== ChannelType.SERVER_TEXT) continue;
      const count = hasNotification(channel);

      if (count !== false) notifications[channel.id] = count;
    }
    return notifications;
  });

  const updateLastMessagedAt = (channelId: string, lastMessagedAt: number) => {
    const channel = channels.get(channelId);
    if (channel) {
      channel.lastMessagedAt = lastMessagedAt;
    }
  };

  const currentChannel = () => {
    return channels.get(currentChannelId!);
  };

  const dismissNotification = (channelId: string) => {
    const hasMention = messageMentionStore.mentions.get(channelId)?.count;
    if (hasMention || notificationsMemo.value()[channelId]) {
      socket.dismissNotification(channelId);
    }
  };

  return {
    channels,
    setChannels,
    get currentChannelId() {
      return currentChannelId;
    },
    addReply,
    removeReply,
    setEditingMessage,
    updateLastMessagedAt,
    setCurrentChannelId,
    notificationsMemo,
    currentChannel,
    getProperty,
    currentChannelProperty,
    setProperty,
    setChannel,
    hasNotification,
    dismissNotification,
    deleteChannel,
    updatePermissions,
  };
}
