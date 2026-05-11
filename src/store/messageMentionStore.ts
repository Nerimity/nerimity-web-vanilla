import type { RawMessageMention } from "../Types";

export const messageMentionStore = createMessageMentionStore();

export class MessageMention {
  channelId: string;
  serverId: string;
  count: number;
  constructor(data: RawMessageMention) {
    this.channelId = data.channelId;
    this.serverId = data.serverId;
    this.count = data.count;
  }
}

function createMessageMentionStore() {
  const mentions = new Map<string, MessageMention>();

  const setMentions = (newMentions: RawMessageMention[]) => {
    mentions.clear();
    for (let i = 0; i < newMentions.length; i++) {
      const mention = newMentions[i]!;
      const existing = mentions.get(mention.channelId);
      if (existing) {
        existing.count = mention.count;
      } else {
        mentions.set(mention.channelId, new MessageMention(mention));
      }
    }
  };

  return { mentions, setMentions };
}
