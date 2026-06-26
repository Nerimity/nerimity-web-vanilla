import { nerimityCDNUploadRequest } from "../services/cdnService";
import {
  fetchMessages,
  patchEditMessage,
  postMessage,
} from "../services/messageService";

import { socket } from "../services/socket";
import type {
  ReactionAddedPayload,
  ReactionRemovedPayload,
} from "../services/socketEvents";
import {
  MessageType,
  type Attachment,
  type HtmlNode,
  type RawMessage,
  type RawMessageEmbed,
  type RawMessageReaction,
  type RawReplyMessage,
  type RawServerRole,
  type RawUser,
} from "../Types";
import { storeEmitter } from "../utils/EventEmitter";
import { getLocalItem } from "../utils/localStorage";
import { unzipJson } from "../utils/zlib";
import { accountStore } from "./accountStore";
import { channelStore, type AttachmentProperty } from "./channelStore";

export const messageStore = createMessageStore();

export type LocalAttachment = Attachment & { cached?: boolean };
export type LocalEmbed = RawMessageEmbed & { cached?: boolean };

export class MessageReaction {
  name: string;
  emojiId: string;
  gif: boolean;
  webp: boolean;
  reacted: boolean;
  count: number;

  constructor(data: Omit<RawMessageReaction, "messageId" | "id">) {
    this.name = data.name;
    this.emojiId = data.emojiId;
    this.gif = data.gif;
    this.webp = data.webp;
    this.reacted = data.reacted;
    this.count = data.count;
  }
}

type MessageState = "sending" | "error";

export class Message {
  id: string;
  content: string;
  createdBy: RawUser;
  channelId: string;
  createdAt: number;
  mentions: RawUser[];
  state?: MessageState;
  tempId?: string;
  attachmentProperty?: AttachmentProperty;
  attachments: LocalAttachment[];
  embed?: LocalEmbed;
  replyMessages?: RawReplyMessage[];
  type: MessageType;
  editedAt?: number;
  reactions?: MessageReaction[];
  showBlocked?: boolean;
  quotedMessages: Partial<RawMessage>[];
  roleMentions: RawServerRole[];
  htmlEmbed?: string;

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
    this.editedAt = data.editedAt;
    this.reactions = data.reactions?.map((r) => new MessageReaction(r));
    this.quotedMessages = data.quotedMessages || [];
    this.roleMentions = data.roleMentions || [];
    this.htmlEmbed = data.htmlEmbed;
  }
  decompressHtmlEmbed() {
    if (!this.htmlEmbed) return;
    return unzipJson(this.htmlEmbed) as HtmlNode[] | HtmlNode;
  }
}

function createMessageStore() {
  const messages = new Map<string, Message[]>();

  const loadMessages = async (
    channelId: string,
    opts?: { before?: string; after?: string; force?: boolean },
  ) => {
    const existing = messages.get(channelId);
    if (!opts?.force && !opts?.before && !opts?.after && existing)
      return existing;

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
    const showBlocked = existing.showBlocked;
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
      editedAt: rawMessage.editedAt ?? existing.editedAt,
      reactions: rawMessage.reactions,
      quotedMessages: rawMessage.quotedMessages ?? existing.quotedMessages,
      roleMentions: rawMessage.roleMentions ?? existing.roleMentions,
      htmlEmbed: rawMessage.htmlEmbed ?? existing.htmlEmbed,

      ...rawMessage,
    });
    message.showBlocked = showBlocked;
    message.state = undefined;
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

    const property = channelStore.getProperty(channelId, false);
    if (!property) return;

    const message = new Message({
      id: Date.now() + "" + Math.random(),
      content: opts.content,
      channelId,
      createdBy: accountStore.currentUser!,
      createdAt: Date.now(),
      type: MessageType.CONTENT,
      quotedMessages: [],
      roleMentions: [],
      replyMessages: property.replyingMessages?.map((m) => ({
        replyToMessage: m,
      })),
    });
    message.state = "sending";
    message.attachmentProperty = property.attachment;
    messages.set(channelId, [...existing, message]);
    storeEmitter.emit("message:created", message);
    return message;
  };

  const editMessage = async (
    channelId: string,
    messageId: string,
    content: string,
  ) => {
    const messages = messageStore.messages.get(channelId);
    if (!messages) return;
    let messageIndex = messages.findLastIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;
    const message = messages[messageIndex]!;
    message.content = content;
    message.state = "sending";
    message.editedAt = Date.now();
    storeEmitter.emit("message:updated", { message, index: messageIndex });

    const [result, error] = await patchEditMessage(
      channelId,
      messageId,
      content,
    );

    if (error) {
      setMessageState(channelId, messageId, "error");
      return;
    }
    messageIndex = messages.findLastIndex((m) => m.id === messageId);
    const newMessage = new Message(result);
    messages[messageIndex] = newMessage;
    storeEmitter.emit("message:updated", {
      message: newMessage,
      index: messageIndex,
    });
  };

  const sendMessage = async (channelId: string, opts: SendMessageOpts) => {
    const localMessage = createLocalMessage(channelId, opts);
    if (!localMessage) return;

    const replies = localMessage.replyMessages;

    const replyToMessageIds = replies?.length
      ? replies.map((m) => m.replyToMessage!.id)
      : undefined;

    const mentionReplies = replies?.length
      ? !!getLocalItem("messageReplyShouldMention", true)
      : undefined;

    const attachment = localMessage.attachmentProperty;

    let attachmentFileId: string | undefined;

    const onUploadProgress = (progress: number, speed?: string) => {
      storeEmitter.emit("attachment:upload_progress", {
        messageId: localMessage.id,
        channelId,
        progress,
        speed,
      });
    };
    if (attachment) {
      const [res, error] = await nerimityCDNUploadRequest({
        file: attachment.file,
        type: "attachments",
        groupId: channelId,
        onUploadProgress,
        channelId,
      });
      if (error) {
        console.log(error);
        setMessageState(channelId, localMessage.id, "error");
        return;
      }
      attachmentFileId = res!.fileId;
    }

    const [result, error] = await postMessage(channelId, {
      content: opts.content.trim() || undefined,
      socketId: socket.socketId,
      replyToMessageIds: replyToMessageIds,
      mentionReplies: mentionReplies,
      nerimityCdnFileId: attachmentFileId,
    });

    if (error) {
      setMessageState(channelId, localMessage.id, "error");
      return;
    }
    const channelMessages = messages.get(channelId);
    if (!channelMessages) return;
    const index = channelMessages.findIndex((m) => m.id === localMessage?.id);
    if (index === -1) return;
    channelMessages[index] = new Message(result);
    channelMessages[index].tempId = localMessage.id;
    storeEmitter.emit("message:updated", {
      message: channelMessages[index],
      index,
    });
  };

  const setMessageState = (
    channelId: string,
    messageId: string,
    state: MessageState,
  ) => {
    const channelMessages = messages.get(channelId);
    if (!channelMessages) return;
    const index = channelMessages.findLastIndex((m) => m.id === messageId);
    if (index === -1) return;
    const message = channelMessages[index]!;
    message.state = state;
    storeEmitter.emit("message:updated", { message, index });
    return;
  };

  const removeReaction = (removedReaction: ReactionRemovedPayload) => {
    const channelMessages = messages.get(removedReaction.channelId);
    if (!channelMessages) return;
    const messageIndex = channelMessages.findLastIndex(
      (m) => m.id === removedReaction.messageId,
    );
    if (messageIndex === -1) return;
    const message = channelMessages[messageIndex]!;
    if (!message) return;

    const reactions = message.reactions;
    if (!reactions) return;
    let reaction = reactions.find((r) => {
      if (removedReaction.emojiId) return r.emojiId === removedReaction.emojiId;
      return r.name === removedReaction.name;
    });
    if (!reaction) return;

    const removedByMe =
      accountStore.currentUser?.id === removedReaction.reactionRemovedByUserId;
    reaction.count = removedReaction.count;
    if (removedByMe) reaction.reacted = false;

    if (reaction.count === 0) {
      const index = reactions.indexOf(reaction);
      if (index !== -1) reactions.splice(index, 1);
    }

    storeEmitter.emit("message:reaction_updated", { message, reaction });
  };

  const addReaction = (addedReaction: ReactionAddedPayload) => {
    const channelMessages = messages.get(addedReaction.channelId);
    if (!channelMessages) return;
    const messageIndex = channelMessages.findLastIndex(
      (m) => m.id === addedReaction.messageId,
    );
    if (messageIndex === -1) return;
    const message = channelMessages[messageIndex]!;
    if (!message) return;

    const reactions = message.reactions || [];
    let reaction = reactions.find((r) => {
      if (addedReaction.emojiId) return r.emojiId === addedReaction.emojiId;
      return r.name === addedReaction.name;
    });

    const reactedByMe =
      accountStore.currentUser?.id === addedReaction.reactedByUserId;

    if (reaction) {
      reaction.count = addedReaction.count;
      if (reactedByMe) reaction.reacted = true;
    } else {
      reaction = new MessageReaction({
        name: addedReaction.name,
        emojiId: addedReaction.emojiId,
        gif: addedReaction.gif,
        webp: addedReaction.webp,
        reacted: reactedByMe,
        count: addedReaction.count,
      });
      reactions.push(reaction);
    }

    message.reactions = reactions;
    storeEmitter.emit("message:reaction_updated", { message, reaction });
  };

  return {
    messages,
    loadMessages,
    pushMessage,
    addReaction,
    removeReaction,
    deleteMessage,
    updateMessage,
    sendMessage,
    editMessage,
  };
}
