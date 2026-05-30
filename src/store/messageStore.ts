import { fetchMessages, postMessage } from "../services/messageService";
import { socket } from "../services/socket";
import {
  MessageType,
  type Attachment,
  type RawMessage,
  type RawMessageEmbed,
  type RawReplyMessage,
  type RawUser,
} from "../Types";
import { storeEmitter } from "../utils/EventEmitter";
import { accountStore } from "./accountStore";
import { channelStore } from "./channelStore";

export const messageStore = createMessageStore();

export type LocalAttachment = Attachment & { cached?: boolean };
export type LocalEmbed = RawMessageEmbed & { cached?: boolean };
export class Message {
  id: string;
  content: string;
  createdBy: RawUser;
  channelId: string;
  createdAt: number;
  mentions: RawUser[];
  state?: "sending" | "error";
  tempId?: string;
  attachments: LocalAttachment[];
  embed?: LocalEmbed;
  replyMessages?: RawReplyMessage[];
  type: MessageType;

  constructor(data: RawMessage) {
    this.id = data.id;
    this.content = data.content;
    this.createdBy = data.createdBy;
    this.channelId = data.channelId;
    this.createdAt = data.createdAt;
    this.mentions = data.mentions || [];
    this.attachments = data.attachments || [];
    this.embed = data.embed;
    this.replyMessages = data.replyMessages;
    this.type = data.type;
  }
}

function createMessageStore() {
  const messages = new Map<string, Message[]>();

  const loadMessages = async (
    channelId: string,
    opts?: { before?: string; after?: string },
  ) => {
    const existing = messages.get(channelId);
    if (!opts?.before && !opts?.after && existing) return existing;

    const [rawMessages, error] = await fetchMessages(channelId, {
      before: opts?.before,
      after: opts?.after,
    });
    if (error) {
      alert(error.message);
      return undefined;
    }

    const newMessages = rawMessages.map((m) => new Message(m));

    const messagesToSet = opts?.before
      ? [...newMessages, ...(existing ?? [])].slice(0, 100)
      : opts?.after
        ? [...(existing ?? []), ...newMessages].slice(-100)
        : newMessages;

    messages.set(channelId, messagesToSet);
    return newMessages;
  };

  const pushMessage = (channelId: string, rawMessage: RawMessage) => {
    const property = channelStore.getProperty(channelId, false);
    if (!property) return;
    if (property.canLoadBottom) return;
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
      mentions: rawMessage.mentions ?? existing.mentions,
      attachments: rawMessage.attachments ?? existing.attachments,
      embed: rawMessage.embed ?? existing.embed,
      replyMessages: rawMessage.replyMessages,
      type: existing.type,
      ...rawMessage,
    });
    channelMessages[messageIndex] = message;
    messages.set(channelId, channelMessages);
    storeEmitter.emit("message:updated", { message, index: messageIndex });
  };

  interface SendMessageOpts {
    content: string;
  }

  const createLocalMessage = (channelId: string, opts: SendMessageOpts) => {
    const existing = messages.get(channelId);
    if (!existing) return;

    const message = new Message({
      id: Date.now() + "" + Math.random(),
      content: opts.content,
      channelId,
      createdBy: accountStore.currentUser!,
      createdAt: Date.now(),
      type: MessageType.CONTENT,
    });
    message.state = "sending";
    messages.set(channelId, [...existing, message]);
    storeEmitter.emit("message:created", message);
    return message;
  };
  const sendMessage = async (channelId: string, opts: SendMessageOpts) => {
    const localMessage = createLocalMessage(channelId, opts);
    if (!localMessage) return;
    const [result, error] = await postMessage(channelId, {
      content: opts.content,
      socketId: socket.socketId,
    });
    const channelMessages = messages.get(channelId);
    if (!channelMessages) return;
    const index = channelMessages.findIndex((m) => m.id === localMessage?.id);
    if (index === -1) return;
    if (error) {
      localMessage.state = "error";
      storeEmitter.emit("message:updated", { message: localMessage, index });
      return;
    }
    channelMessages[index] = new Message(result);
    channelMessages[index].tempId = localMessage.id;
    storeEmitter.emit("message:updated", {
      message: channelMessages[index],
      index,
    });
  };

  return {
    messages,
    loadMessages,
    pushMessage,
    deleteMessage,
    updateMessage,
    sendMessage,
  };
}
