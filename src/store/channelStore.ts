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
    const lastSeenAt = lastSeen.get(channel.id);
    const hasNotSeen =
      channel.lastMessagedAt &&
      (!lastSeenAt || channel.lastMessagedAt! > lastSeenAt);
    if (hasNotSeen) {
      return -1;
    }
    return false;
  };

  const notificationsMemo = new ManualMemo(() => {
    const notifications: Record<string, number> = {};

    for (const channel of channels.values()) {
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

  return {
    channels,
    setChannels,
    get currentChannelId() {
      return currentChannelId;
    },
    updateLastMessagedAt,
    setCurrentChannelId,
    notificationsMemo,
    currentChannel,
    getProperty,
    setProperty,
    setChannel,
    hasNotification,
  };
}
