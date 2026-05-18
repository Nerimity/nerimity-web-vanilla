import { accountStore } from "../store/accountStore";
import { channelStore } from "../store/channelStore";
import { messageMentionStore } from "../store/messageMentionStore";
import { messageStore } from "../store/messageStore";
import { serverMemberStore } from "../store/serverMemberStore";
import { serverRoleStore } from "../store/serverRoleStore";
import { serverStore } from "../store/serverStore";
import { userPresenceStore } from "../store/userPresenceStore";
import type { RawMessage, RawServerMember } from "../Types";
import { decompressObject } from "../utils/zstd";
import { socket } from "./socket";

export const socketEventHandler = (event: string, payload: any) => {
  if (payload instanceof ArrayBuffer) {
    payload = decompressObject(new Uint8Array(payload));
  }
  if (event === "user:authenticated") {
    onAuthenticated(payload);
  }
  // if (event === "server:channel_updated") {
  //   onServerChannelUpdated(payload);
  // }
  if (event === "user:presence_update") {
    onUserPresenceUpdate(payload);
  }
  if (event === "message:created") {
    onMessageCreated(payload);
  }
  if (event === "message:deleted") {
    onMessageDeleted(payload);
  }
  if (event === "message:updated") {
    onMessageUpdated(payload);
  }

  if (event === "notification:dismissed") {
    onNotificationDismissed(payload);
  }
  if (event === "server:members_fetched") {
    onServerMembersFetched(payload);
  }
};

const onAuthenticated = (payload: any) => {
  accountStore.setNotificationSettings(payload.notificationSettings);
  channelStore.setChannels(payload.channels);
  serverStore.setServers(payload.servers, payload.currentServerId);
  serverStore.setLastSeenChannelIds(payload.lastSeenServerChannelIds);
  serverMemberStore.setServerMembers(payload.serverMembers);
  serverRoleStore.setRoles(payload.serverRoles);
  userPresenceStore.setPresences(payload.presences);
  messageMentionStore.setMentions(payload.messageMentions);
  accountStore.setCurrentUser(payload.user);
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
