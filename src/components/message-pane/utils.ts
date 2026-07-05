import { accountStore } from "../../store/accountStore";

import { type Message } from "../../store/messageStore";
import {
  serverMemberStore,
  type ServerMember,
} from "../../store/serverMemberStore";
import { Server, serverStore } from "../../store/serverStore";
import type { User } from "../../store/userStore";
import { MessageType } from "../../Types";
import { customShortcodeToIds, shortcodeToUnicode } from "../../utils/emojis";
import { RolePermissionFlag } from "../../utils/RolePermissionFlag";

export const shouldGroup = (message: Message, prev?: Message): boolean => {
  if (!prev) return false;
  if (message.createdBy.id !== prev.createdBy.id) return false;
  if (message.replyMessages?.length) return false;
  const diff = message.createdAt - prev.createdAt;
  if (diff > 5 * 60 * 1000) return false;
  if (prev.type !== MessageType.CONTENT) return false;
  if (message.type !== MessageType.CONTENT) return false;
  return true;
};

const MS_PER_DAY = 86400000;
const TZ_OFFSET = new Date().getTimezoneOffset() * 60000;

export const isNewDay = (message: Message, prev?: Message) => {
  if (!prev) return true;
  const prevLocal = prev.createdAt - TZ_OFFSET;
  const prevMidnight = prevLocal - (prevLocal % MS_PER_DAY);
  return message.createdAt - TZ_OFFSET >= prevMidnight + MS_PER_DAY;
};

export const getLastSeenMessage = (channelId: string, messages: Message[]) => {
  const lastSeenAt = serverStore.lastSeenChannelIds.get(channelId);
  const selfUserId = accountStore.currentUser?.id;
  if (!lastSeenAt) return null;
  const message = messages.find((m) => {
    if (m.createdBy.id === selfUserId) return false;
    return m.createdAt - lastSeenAt >= 0;
  });
  return message || null;
};

export const isNewUser = (user?: User) => {
  const createdAt = user?.joinedAt;
  if (!createdAt) return false;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return createdAt > sevenDaysAgo;
};

export const isMentioned = (opts: {
  message: Message;
  server?: Server;
  member?: ServerMember;
}) => {
  const { message, member, server } = opts;

  const currentUserId = accountStore.currentUser?.id;
  const currentMember = server && serverMemberStore.currentMember(server.id);

  const authorPerms =
    server && member
      ? serverMemberStore.createPermChecker(member.serverId, member.userId)
      : null;

  const isEveryoneMentioned = message.content?.includes("[@:e]");
  if (isEveryoneMentioned) {
    if (!member) return true;
    const hasEveryonePerm = authorPerms?.hasPermission(
      RolePermissionFlag.mentionEveryone.bit,
    );
    if (hasEveryonePerm) return true;
  }

  const isQuoted = message.quotedMessages?.find(
    (m) => m.createdBy?.id === currentUserId,
  );
  if (isQuoted) return true;

  const isReplied = message.replyMessages?.find(
    (m) => m.replyToMessage?.createdBy?.id === currentUserId,
  );
  if (isReplied) return true;

  if (currentMember && member) {
    const roleMentioned = message.roleMentions.find(
      (r) =>
        r.id !== server?.defaultRoleId && currentMember.roleIds.includes(r.id),
    );
    if (roleMentioned) {
      const hasMentionRolePerms = authorPerms?.hasPermission(
        RolePermissionFlag.mentionRoles.bit,
      );
      if (hasMentionRolePerms) return true;
    }
  }

  const isMentioned = message.mentions?.find((u) => u.id === currentUserId);

  return !!isMentioned;
};

const emojiRegex = /:[\w+-]+:/g;

export const formatMessage = (opts: { content: string }) => {
  let finalString = opts.content;

  finalString = finalString.replace(emojiRegex, (val) => {
    const emojiName = val.substring(1, val.length - 1);
    const emojiUnicode = shortcodeToUnicode[emojiName];
    if (emojiUnicode) return emojiUnicode;

    const customEmoji = customShortcodeToIds[emojiName];
    if (customEmoji) return `[${customEmoji}]`;

    return val;
  });

  return finalString;
};
