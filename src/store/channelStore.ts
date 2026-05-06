import type { RawChannel } from "../Types";
import { storeEmitter } from "../utils/EventEmitter";

export const channelStore = createChannelStore();

export class Channel {
  id: string;
  name?: string;
  serverId?: string;
  order?: number;
  type: number;
  categoryId?: string;
  constructor(data: RawChannel) {
    this.id = data.id;
    this.name = data.name;
    this.serverId = data.serverId;
    this.order = data.order;
    this.type = data.type;
    this.categoryId = data.categoryId;
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

  return {
    channels,
    setChannels,
    get currentChannelId() {
      return currentChannelId;
    },
    setCurrentChannelId,
  };
}
