// TODO: On server join event, if its a bot, flush bot commands cache for that server.

import { accountStore, type CurrentUser } from "../store/accountStore";
import { channelStore } from "../store/channelStore";
import { friendStore } from "../store/friendStore";
import { inboxStore } from "../store/inboxStore";
import { messageMentionStore } from "../store/messageMentionStore";
import { messageStore } from "../store/messageStore";
import { serverMemberStore } from "../store/serverMemberStore";
import { serverRoleStore } from "../store/serverRoleStore";
import { serverStore } from "../store/serverStore";
import {
  userPresenceStore,
  UserPresenceType,
} from "../store/userPresenceStore";
import { userStore } from "../store/userStore";
import {
  FriendStatus,
  MessageType,
  type RawChannel,
  type RawCustomEmoji,
  type RawFriend,
  type RawInbox,
  type RawMessage,
  type RawNotice,
  type RawServerMember,
  type RawServerRole,
  type RawUser,
  type RawUserActivity,
  type RawUserNotificationSettings,
} from "../Types";
import {
  createCustomEmojiLoader,
  loadCustomEmojisFromServers,
} from "../utils/emojis";
import { storeEmitter } from "../utils/EventEmitter";
import { socket } from "./socket";

const handlers: Record<string, (payload: any) => void> = {
  "channel:typing": onTyping,
  "user:authenticated": onAuthenticated,
  "user:updated": onUserUpdated,
  "user:updatedSelf": onUserSelfUpdated,
  "user:authenticate_error": onAuthError,
  "user:presence_update": onUserPresenceUpdate,
  "user:notice_created": onNoticeCreated,
  "message:created": onMessageCreated,
  "message:deleted": onMessageDeleted,
  "message:updated": onMessageUpdated,
  "notification:dismissed": onNotificationDismissed,
  "server:members_fetched": onServerMembersFetched,
  "inbox:opened": onInboxOpened,
  "inbox:closed": onInboxClosed,
  "user:notification_settings_update": onNotificationSettingsUpdate,
  "server:channel_created": onServerChannelCreated,
  "server:channel_permissions_updated": onServerChannelPermissionsUpdated,
  "server:role_updated": onServerRoleUpdated,
  "server:member_updated": onServerMemberUpdated,
  "server:role_deleted": onServerRoleDeleted,
  "server:channel_deleted": onServerChannelDeleted,
  "message:reaction_added": onMessageReactionAdded,
  "message:reaction_removed": onMessageReactionRemoved,
  "server:emoji_add": onServerEmojiAdded,
  "server:emoji_remove": onServerEmojiRemoved,
  "server:emoji_update": onServerEmojiUpdated,
  "friend:request_sent": onFriendRequest,
  "friend:request_pending": onFriendRequest,
  "friend:request_accepted": onFriendRequestAccept,
  "friend:removed": onFriendRemove,
};

export const socketEventHandler = async (event: string, payload: any) => {
  if (payload instanceof ArrayBuffer) {
    const { decompressObject } = await import("../utils/zstd");
    payload = decompressObject(new Uint8Array(payload));
  }

  const handler = handlers[event];
  if (!handler) {
    console.warn("Unhandled socket event:", event, payload);
    return;
  }

  handler(payload);
};

const showWarnModal = async () => {
  if (!accountStore.currentUser?.notices.length) return;
  const { createWarnModal } = await import("../components/createWarnModal");

  createWarnModal();
};

async function onAuthError(payload: any) {
  console.error("Auth Error", payload);
  accountStore.setAuthError(payload);
  const { createAuthErrorModal } =
    await import("../components/createAuthErrorModal");
  createAuthErrorModal();
}

function onAuthenticated(payload: any) {
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

  loadCustomEmojisFromServers(payload.servers);

  channelStore.notificationsMemo.rerun();
  serverStore.notificationsMemo.rerun();
  accountStore.setAuthenticated(true);
  accountStore.setSessionId(payload.sessionId);

  showWarnModal();
}

// function onServerChannelUpdated  (payload: any){
//   // channelStore.updateChannel(payload.channelId, payload);
// };

function onUserPresenceUpdate(payload: {
  userId: string;
  status?: (typeof UserPresenceType)[keyof typeof UserPresenceType];
  custom?: string;
  activities?: RawUserActivity[];
}) {
  if (payload.status === UserPresenceType.OFFLINE) {
    const user = userStore.users.get(payload.userId);
    user?.updateLastOnlineAt();
  }
  userPresenceStore.updatePresence(payload.userId, payload);
}

function onUserSelfUpdated(payload: Partial<CurrentUser>) {
  const user = userStore.users.get(accountStore.currentUser?.id!);
  user?.update(payload);
}

function onUserUpdated(payload: { userId: string; updated: Partial<RawUser> }) {
  const user = userStore.users.get(payload.userId);
  user?.update(payload.updated);
}

function onMessageCreated(payload: { message: RawMessage; socketId?: string }) {
  storeEmitter.emit("message:created_raw", payload.message);
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

  const isSystemMessage = payload.message.type !== MessageType.CONTENT;

  const notificationBefore = !channel
    ? false
    : channelStore.hasNotification(channel);

  if (!isSystemMessage && createdByMe) {
    serverStore.updateLastSeenServerChannel(
      message.channelId,
      message.createdAt + 1,
    );
  }

  channelStore.updateLastMessagedAt(message.channelId, message.createdAt);
  if (!createdByMe) {
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
}

function onMessageDeleted(payload: any) {
  messageStore.deleteMessage(payload.channelId, payload.messageId);
}

function onMessageUpdated(payload: {
  channelId: string;
  messageId: string;
  updated: RawMessage;
}) {
  storeEmitter.emit("message:updated_raw", payload.updated);
  messageStore.updateMessage(
    payload.channelId,
    payload.messageId,
    payload.updated,
  );
}

function onNotificationDismissed(payload: { channelId: string }) {
  messageMentionStore.removeMention(payload.channelId);
  serverStore.updateLastSeenServerChannel(payload.channelId);
}

function onServerMembersFetched(payload: {
  serverId: string;
  members: RawServerMember[];
}) {
  serverMemberStore.setServerMembers(payload.members, payload.serverId);
}

function onInboxOpened(payload: { channel: RawChannel } & RawInbox) {
  channelStore.setChannel(payload.channel);
  inboxStore.setInbox(payload);
}

async function onInboxClosed(payload: { channelId: string }) {
  channelStore.removeChannel(payload.channelId);
  inboxStore.removeInbox(payload.channelId);
}

function onTyping(payload: { channelId: string; userId: string }) {
  storeEmitter.emit("channel:typing", payload);
}

function onNotificationSettingsUpdate(payload: {
  serverId?: string;
  channelId?: string;
  updated: Partial<RawUserNotificationSettings>;
}) {
  accountStore.updateNotificationSetting({
    serverId: payload.serverId,
    channelId: payload.channelId,
    ...payload.updated,
  });
}

function onServerChannelCreated(payload: { channel: RawChannel }) {
  channelStore.setChannel(payload.channel);
}

function onServerChannelPermissionsUpdated(payload: {
  permissions: 0;
  roleId: string;
  serverId: string;
  channelId: string;
}) {
  channelStore.updatePermissions(payload);
}

function onServerRoleUpdated(payload: {
  serverId: string;
  roleId: string;
  updated: Partial<RawServerRole>;
}) {
  serverRoleStore.updateRole(payload.serverId, payload.roleId, payload.updated);
}

function onServerMemberUpdated(payload: {
  serverId: string;
  userId: string;
  updated: Partial<RawServerMember>;
}) {
  serverMemberStore.updateMember(
    payload.serverId,
    payload.userId,
    payload.updated,
  );
}

function onServerRoleDeleted(payload: { serverId: string; roleId: string }) {
  serverRoleStore.deleteRole(payload.serverId, payload.roleId);
}

function onServerChannelDeleted(payload: {
  serverId: string;
  channelId: string;
}) {
  channelStore.deleteChannel(payload.channelId, payload.serverId);
}

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

function onMessageReactionAdded(payload: ReactionAddedPayload) {
  messageStore.addReaction(payload);
}
export interface ReactionRemovedPayload {
  reactionRemovedByUserId: string;
  messageId: string;
  channelId: string;
  emojiId: string;
  name: string;
  count: number;
  gif: boolean;
}

function onMessageReactionRemoved(payload: ReactionRemovedPayload) {
  messageStore.removeReaction(payload);
}

type EmojiAddedPayload = {
  emoji: RawCustomEmoji & {
    uploadedById?: string;
  };
  serverId: string;
};
async function onServerEmojiAdded(payload: EmojiAddedPayload) {
  delete payload.emoji.uploadedById;
  const loader = await createCustomEmojiLoader();
  loader?.put(payload.serverId, payload.emoji);
  loader?.done();
}
async function onServerEmojiRemoved(payload: {
  serverId: string;
  emojiId: string;
}) {
  const loader = await createCustomEmojiLoader();
  loader?.remove(payload.emojiId);
  loader?.done();
}

async function onServerEmojiUpdated(payload: {
  serverId: string;
  emojiId: string;
  name: string;
}) {
  const loader = await createCustomEmojiLoader();
  await loader?.update(payload.emojiId, payload.name);
  loader?.done();
}

function onFriendRequest(payload: RawFriend) {
  friendStore.setFriend(payload);
}

function onFriendRequestAccept(payload: { friendId: string }) {
  friendStore.updateStatus(payload.friendId, FriendStatus.FRIENDS);
}

function onFriendRemove(payload: { friendId: string }) {
  friendStore.remove(payload.friendId);
}

function onNoticeCreated(payload: RawNotice) {
  accountStore.currentUser?.notices.push(payload);
  showWarnModal();
}
