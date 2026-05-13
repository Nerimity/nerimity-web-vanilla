import {
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
  type: number;
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

function createChannelStore() {
  let currentChannelId: string | null = null;
  const channels = new Map<string, Channel>();

  const setChannels = (newChannels: RawChannel[]) => {
    channels.clear();
    for (let i = 0; i < newChannels.length; i++) {
      const channel = newChannels[i]!;
      channels.set(channel.id, new Channel(channel));
    }
  };

  const setCurrentChannelId = (id?: string) => {
    let newId = id ?? null;
    if (newId === currentChannelId) return;
    currentChannelId = newId;
    storeEmitter.emit("navigate:channelId", newId);
  };

  const notificationsMemo = new ManualMemo(() => {
    const notifications: Record<string, number> = {};

    const mentions = messageMentionStore.mentions;
    const lastSeen = serverStore.lastSeenChannelIds;

    for (const channel of channels.values()) {
      const notifySettings = accountStore.notificationSettings.get(channel.id);

      const muted =
        notifySettings?.notificationPingMode === NotificationMode.MUTE;
      const mentionsOnly =
        notifySettings?.notificationPingMode === NotificationMode.MENTIONS_ONLY;
      if (muted) continue;

      const mentionCount = mentions.get(channel.id)?.count;
      if (mentionCount && mentionCount > 0) {
        notifications[channel.id] = mentionCount;
        continue;
      }
      if (mentionsOnly) continue;
      if (!channel.serverId) continue;
      const lastSeenAt = lastSeen.get(channel.id);
      const hasNotSeen =
        channel.lastMessagedAt &&
        (!lastSeenAt || channel.lastMessagedAt! > lastSeenAt);
      if (hasNotSeen) {
        if (channel.id === "1756082194151030785") {
        }
        notifications[channel.id] = -1;
      }
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
  };
}
