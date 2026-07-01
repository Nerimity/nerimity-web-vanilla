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
  RawServerRole,
  RawUserNotificationSettings,
} from "../Types";
import { storeEmitter } from "../utils/EventEmitter";
import { decompressObject } from "../utils/zstd";
import { socket } from "./socket";

export const socketEventHandler = (event: string, payload: any) => {
  if (payload instanceof ArrayBuffer) {
    payload = decompressObject(new Uint8Array(payload));
  }

  switch (event) {
    case "channel:typing":
      onTyping(payload);
      break;
    case "user:authenticated":
      onAuthenticated(payload);
      break;
    case "user:authenticate_error":
      onAuthError(payload);
      break;
    case "user:presence_update":
      onUserPresenceUpdate(payload);
      break;
    case "message:created":
      onMessageCreated(payload);
      break;
    case "message:deleted":
      onMessageDeleted(payload);
      break;
    case "message:updated":
      onMessageUpdated(payload);
      break;
    case "notification:dismissed":
      onNotificationDismissed(payload);
      break;
    case "server:members_fetched":
      onServerMembersFetched(payload);
      break;
    case "inbox:opened":
      onInboxOpened(payload);
      break;
    case "user:notification_settings_update":
      onNotificationSettingsUpdate(payload);
      break;
    case "server:channel_created":
      onServerChannelCreated(payload);
      break;
    case "server:channel_permissions_updated":
      onServerChannelPermissionsUpdated(payload);
      break;
    case "server:role_updated":
      onServerRoleUpdated(payload);
      break;
    case "server:member_updated":
      onServerMemberUpdated(payload);
      break;
    case "server:role_deleted":
      onServerRoleDeleted(payload);
      break;
    case "server:channel_deleted":
      onServerChannelDeleted(payload);
      break;
    case "message:reaction_added":
      onMessageReactionAdded(payload);
      break;
    case "message:reaction_removed":
      onMessageReactionRemoved(payload);
      break;
    default:
      console.warn("Unhandled socket event:", event, payload);
  }
};

const onAuthError = (payload: any) => {
  console.error("Auth Error", payload);
  accountStore.setAuthError(payload);
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

  channelStore.notificationsMemo.rerun();
  serverStore.notificationsMemo.rerun();
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

  const channel = channelStore.channels.get(message.channelId);
  const currentUserId = accountStore.currentUser?.id;
  const createdByMe = message.createdBy.id == currentUserId;
  const isDmMessage = !channel || !channel?.serverId;
  const isServerMessage = channel && channel?.serverId;
  const isMentioned = payload.message.mentions?.find(
    (m) => m.id === currentUserId,
  );
  const notificationBefore = !channel
    ? false
    : channelStore.hasNotification(channel);

  if (!createdByMe) {
    channelStore.updateLastMessagedAt(message.channelId, message.createdAt);

    if (isDmMessage || isMentioned) {
      const mention = messageMentionStore.incrementMention({
        channelId: message.channelId,
        mentionedBy: message.createdBy,
        serverId: channel?.serverId,
        count: 1,
      });
      if (isDmMessage) {
        storeEmitter.emit("mention:dm_update", mention);
      }
    }
    if (isServerMessage) {
      const notificationAfter = channelStore.hasNotification(channel);
      if (notificationBefore !== notificationAfter) {
        channelStore.notificationsMemo.rerun();
        serverStore.notificationsMemo.rerun();
        storeEmitter.emit("channel:notify_update", {
          channelId: message.channelId,
          serverId: channel?.serverId,
        });
      }
    }
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
  messageMentionStore.removeMention(payload.channelId);
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

const onTyping = (payload: { channelId: string; userId: string }) => {
  storeEmitter.emit("channel:typing", payload);
};

const onNotificationSettingsUpdate = (payload: {
  serverId?: string;
  channelId?: string;
  updated: Partial<RawUserNotificationSettings>;
}) => {
  accountStore.updateNotificationSetting({
    serverId: payload.serverId,
    channelId: payload.channelId,
    ...payload.updated,
  });
};

const onServerChannelCreated = (payload: { channel: RawChannel }) => {
  channelStore.setChannel(payload.channel);
};

const onServerChannelPermissionsUpdated = (payload: {
  permissions: 0;
  roleId: string;
  serverId: string;
  channelId: string;
}) => {
  channelStore.updatePermissions(payload);
};

const onServerRoleUpdated = (payload: {
  serverId: string;
  roleId: string;
  updated: Partial<RawServerRole>;
}) => {
  serverRoleStore.updateRole(payload.serverId, payload.roleId, payload.updated);
};

const onServerMemberUpdated = (payload: {
  serverId: string;
  userId: string;
  updated: Partial<RawServerMember>;
}) => {
  serverMemberStore.updateMember(
    payload.serverId,
    payload.userId,
    payload.updated,
  );
};

const onServerRoleDeleted = (payload: { serverId: string; roleId: string }) => {
  serverRoleStore.deleteRole(payload.serverId, payload.roleId);
};

const onServerChannelDeleted = (payload: {
  serverId: string;
  channelId: string;
}) => {
  channelStore.deleteChannel(payload.channelId, payload.serverId);
};

export interface ReactionAddedPayload {
  reactedByUserId: string;
  messageId: string;
  channelId: string;
  emojiId: string;
  name: string;
  gif: boolean;
  webp: boolean;
  count: number;
}

const onMessageReactionAdded = (payload: ReactionAddedPayload) => {
  messageStore.addReaction(payload);
};
export interface ReactionRemovedPayload {
  reactionRemovedByUserId: string;
  messageId: string;
  channelId: string;
  emojiId: string;
  name: string;
  count: number;
  gif: boolean;
}

const onMessageReactionRemoved = (payload: ReactionRemovedPayload) => {
  messageStore.removeReaction(payload);
};
