import { accountStore } from "../store/accountStore";
import { channelStore } from "../store/channelStore";
import { friendStore } from "../store/friendStore";
import { inboxStore } from "../store/inboxStore";
import { messageMentionStore } from "../store/messageMentionStore";
import { messageStore } from "../store/messageStore";
import { serverMemberStore } from "../store/serverMemberStore";
import { serverRoleStore } from "../store/serverRoleStore";
import { serverStore } from "../store/serverStore";
import { userPresenceStore } from "../store/userPresenceStore";
import type {
  RawChannel,
  RawInbox,
  RawMessage,
  RawServerMember,
} from "../Types";
import { storeEmitter } from "../utils/EventEmitter";
import { decompressObject } from "../utils/zstd";
import { socket } from "./socket";

export const socketEventHandler = (event: string, payload: any) => {
  if (payload instanceof ArrayBuffer) {
    payload = decompressObject(new Uint8Array(payload));
  }
  if (event === "user:authenticated") {
    onAuthenticated(payload);
    return;
  }
  // if (event === "server:channel_updated") {
  //   onServerChannelUpdated(payload);
  // }
  if (event === "user:presence_update") {
    onUserPresenceUpdate(payload);
    return;
  }
  if (event === "message:created") {
    onMessageCreated(payload);
    return;
  }
  if (event === "message:deleted") {
    onMessageDeleted(payload);
    return;
  }
  if (event === "message:updated") {
    onMessageUpdated(payload);
    return;
  }

  if (event === "notification:dismissed") {
    onNotificationDismissed(payload);
    return;
  }
  if (event === "server:members_fetched") {
    onServerMembersFetched(payload);
    return;
  }
  if (event === "inbox:opened") {
    onInboxOpened(payload);
    return;
  }
};

const onAuthenticated = (payload: any) => {
  accountStore.setNotificationSettings(payload.notificationSettings);
  channelStore.setChannels(payload.channels);
  inboxStore.setInboxes(payload.inbox);
  serverStore.setServers(payload.servers, payload.currentServerId);
  serverStore.setLastSeenChannelIds(payload.lastSeenServerChannelIds);
  serverMemberStore.setServerMembers(payload.serverMembers);
  serverRoleStore.setRoles(payload.serverRoles);
  userPresenceStore.setPresences(payload.presences);
  messageMentionStore.setMentions(payload.messageMentions);
  accountStore.setCurrentUser(payload.user);
  friendStore.setFriends(payload.friends);
  accountStore.setAuthenticated(true);
};

// const onServerChannelUpdated = (payload: any) => {
//   // channelStore.updateChannel(payload.channelId, payload);
// };

const onUserPresenceUpdate = (payload: any) => {
  userPresenceStore.updatePresence(payload.userId, payload);
};

const onMessageCreated = (payload: {
  message: RawMessage;
  socketId?: string;
}) => {
  if (payload.socketId && payload.socketId === socket.socketId) return;
  const message = payload.message;
  const createdByMe = message.createdBy.id == accountStore.currentUser?.id;
  const channel = channelStore.channels.get(message.channelId);
  if (channel && !createdByMe) {
    channelStore.updateLastMessagedAt(message.channelId, message.createdAt);
    channelStore.notificationsMemo.rerun();
    serverStore.notificationsMemo.rerun();
  }

  const isDmMessage = !channel || !channel?.serverId;
  if (isDmMessage && !createdByMe) {
    const mention = messageMentionStore.incrementMention({
      channelId: message.channelId,
      mentionedBy: message.createdBy,
      count: 1,
    });
    storeEmitter.emit("mention:dm_update", mention);
  }

  messageStore.pushMessage(message.channelId, message);
};

const onMessageDeleted = (payload: any) => {
  messageStore.deleteMessage(payload.channelId, payload.messageId);
};

const onMessageUpdated = (payload: any) => {
  messageStore.updateMessage(
    payload.channelId,
    payload.messageId,
    payload.updated,
  );
};

const onNotificationDismissed = (payload: { channelId: string }) => {
  serverStore.updateLastSeenServerChannel(payload.channelId);
};

const onServerMembersFetched = (payload: {
  serverId: string;
  members: RawServerMember[];
}) => {
  serverMemberStore.setServerMembers(payload.members, payload.serverId);
};

const onInboxOpened = (payload: { channel: RawChannel } & RawInbox) => {
  channelStore.setChannel(payload.channel);
  inboxStore.setInbox(payload);
};
