import type { RawMessageMention, RawUser } from "../Types";

export const messageMentionStore = createMessageMentionStore();

export class MessageMention {
  channelId: string;
  serverId?: string;
  count: number;
  mentionedBy: RawUser;
  constructor(data: RawMessageMention) {
    this.channelId = data.channelId;
    this.serverId = data.serverId;
    this.count = data.count;
    this.mentionedBy = data.mentionedBy;
  }
}

function createMessageMentionStore() {
  const mentions = new Map<string, MessageMention>();

  const setMentions = (newMentions: RawMessageMention[]) => {
    mentions.clear();
    for (let i = 0; i < newMentions.length; i++) {
      const mention = newMentions[i]!;
      console.log(mention);
      const existing = mentions.get(mention.channelId);
      if (existing) {
        existing.count = mention.count;
      } else {
        mentions.set(mention.channelId, new MessageMention(mention));
      }
    }
  };

  const incrementMention = (mention: {
    channelId: string;
    mentionedBy: RawUser;
    serverId?: string;
    count: number;
  }) => {
    const existing = mentions.get(mention.channelId);
    if (existing) {
      existing.count++;
      return existing;
    } else {
      const newMention = new MessageMention(mention);
      mentions.set(mention.channelId, newMention);
      return mention;
    }
  };

  return { mentions, setMentions, incrementMention };
}
