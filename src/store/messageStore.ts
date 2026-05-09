import type { RawMessage, RawUser } from "../Types";
import { storeEmitter } from "../utils/EventEmitter";

export const messageStore = createMessageStore();

export class Message {
  id: string;
  content: string;
  createdBy: RawUser;
  channelId: string;
  constructor(data: RawMessage) {
    this.id = data.id;
    this.content = data.content;
    this.createdBy = data.createdBy;
    this.channelId = data.channelId;
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

  return { messages, loadMessages, pushMessage };
}
