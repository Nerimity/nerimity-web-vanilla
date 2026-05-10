import type { RawMessage, RawUser } from "../Types";
import { storeEmitter } from "../utils/EventEmitter";

export const messageStore = createMessageStore();

export class Message {
  id: string;
  content: string;
  createdBy: RawUser;
  channelId: string;
  createdAt: number;
  mentions: RawUser[];
  constructor(data: RawMessage) {
    this.id = data.id;
    this.content = data.content;
    this.createdBy = data.createdBy;
    this.channelId = data.channelId;
    this.createdAt = data.createdAt;
    this.mentions = data.mentions || [];
  }
}

function createMessageStore() {
  const messages = new Map<string, Message[]>();

  const loadMessages = async (channelId: string) => {
    const existing = messages.get(channelId);
    if (existing) return existing;
    const response = await fetch(
      `https://nerimity.com/api/channels/${channelId}/messages`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("userToken") as string,
        },
      },
    );
    const json = (await response.json()) as RawMessage[];

    const newMessages = json.map((m) => new Message(m));

    messages.set(channelId, newMessages);
    return newMessages;
  };

  const pushMessage = (channelId: string, rawMessage: RawMessage) => {
    const existing = messages.get(channelId);
    if (!existing) return;
    const message = new Message(rawMessage);
    const updated = [...existing, message];
    if (updated.length > 100) updated.splice(0, updated.length - 100);
    messages.set(channelId, updated);
    storeEmitter.emit("message:created", message);
  };
  const deleteMessage = (channelId: string, messageId: string) => {
    const existing = messages.get(channelId);
    if (!existing) return;
    const index = existing.findLastIndex((m) => m.id === messageId);
    if (index === -1) return;
    existing.splice(index, 1);
    messages.set(channelId, existing);
    storeEmitter.emit("message:deleted", { id: messageId, channelId });
  };

  const updateMessage = (
    channelId: string,
    messageId: string,
    rawMessage: Partial<RawMessage>,
  ) => {
    const channelMessages = messages.get(channelId);
    if (!channelMessages) return;
    const messageIndex = channelMessages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;
    const existing = channelMessages[messageIndex]!;
    const message = new Message({
      id: existing.id,
      channelId: existing.channelId,
      content: rawMessage.content ?? existing.content,
      createdBy: existing.createdBy,
      createdAt: existing.createdAt,
      ...rawMessage,
    });
    channelMessages[messageIndex] = message;
    messages.set(channelId, channelMessages);
    storeEmitter.emit("message:updated", { message, index: messageIndex });
  };

  return { messages, loadMessages, pushMessage, deleteMessage, updateMessage };
}
