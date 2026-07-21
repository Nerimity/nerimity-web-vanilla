import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { inboxStore } from "../../store/inboxStore";
import { type Message } from "../../store/messageStore";
import {
  serverMemberStore,
  type ServerMember,
} from "../../store/serverMemberStore";
import { serverRoleStore } from "../../store/serverRoleStore";
import { Server, serverStore } from "../../store/serverStore";
import { userStore, type User } from "../../store/userStore";
import { MessageType } from "../../Types";
import { customShortcodeToIds, shortcodeToUnicode } from "../../utils/emojis";
import { randomKaomoji } from "../../utils/kaomoji";
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

function randomIndex(arrLength: number) {
  return Math.floor(Math.random() * arrLength);
}

const emojiRegex = /:[\w+-]+:/g;
const userMentionRegex = /@([^@:]+):([a-zA-Z0-9]+)/gu;
const channelMentionRegex = /#([^#]+)#/gu;
const roleMentionRegex = /@([^@]+)@/gu;

export const formatMessage = (opts: {
  content: string;
  isEditing?: boolean;
}) => {
  const { content, isEditing } = opts;

  const serverId = serverStore.currentServerId;
  const channelId = channelStore.currentChannelId;
  const isDmChannel = !!channelId && !serverId;

  const someoneMentioned = !isEditing && content.includes("@someone");

  let result = replaceEmojis(content);

  if (isDmChannel) {
    result = formatDmMentions(result, channelId!, someoneMentioned);
  }

  if (serverId) {
    result = formatServerMentions(result, serverId, someoneMentioned);
  }

  return result.replaceAll("@everyone", "[@:e]");
};

const replaceEmojis = (text: string) =>
  text.replace(emojiRegex, (val) => {
    const emojiName = val.substring(1, val.length - 1);

    const emojiUnicode = shortcodeToUnicode[emojiName];
    if (emojiUnicode) return emojiUnicode;

    const customEmoji = customShortcodeToIds[emojiName];
    if (customEmoji) return `[${customEmoji}]`;

    return val;
  });

const formatDmMentions = (
  text: string,
  channelId: string,
  someoneMentioned: boolean,
) => {
  const inbox = inboxStore.inboxes.get(channelId);
  const recipient = userStore.users.get(inbox?.recipientId!);
  const me = userStore.users.get(accountStore.currentUser?.id!);

  if (!me || !recipient) return text;

  const users = [recipient, me];

  let result = text.replace(userMentionRegex, (match, name, tag) => {
    const user = users.find((u) => u.username === name && u.tag === tag);
    return user ? `[@:${user.id}]` : match;
  });

  if (someoneMentioned) {
    result = result.replaceAll(
      "@someone",
      () =>
        `[@:s] **${randomKaomoji()} (${users[randomIndex(users.length)]?.username})**`,
    );
  }

  return result;
};

const formatServerMentions = (
  text: string,
  serverId: string,
  someoneMentioned: boolean,
) => {
  let result = text.replace(userMentionRegex, (match, name, tag) => {
    const members = serverMemberStore.serverMembers.get(serverId)?.values();
    if (!members) return match;

    for (const member of members) {
      if (member.user?.username === name && member.user?.tag === tag) {
        return `[@:${member.user?.id}]`;
      }
    }
    return match;
  });

  result = result.replaceAll(roleMentionRegex, (match, group) => {
    const roles = serverRoleStore.roles.get(serverId)?.values();
    if (!roles) return match;

    for (const role of roles) {
      if (role.name === group) return `[r:${role.id}]`;
    }
    return match;
  });

  const channels = serverStore.currentChannelsSorted.value();
  result = result.replaceAll(channelMentionRegex, (match, group) => {
    const channel = channels?.find((c) => c.name === group);
    return channel ? `[#:${channel.id}]` : match;
  });

  if (someoneMentioned) {
    const members = [
      ...(serverMemberStore.serverMembers.get(serverId)?.values() || []),
    ];
    result = result.replaceAll("@someone", () => {
      const randMember = members[randomIndex(members.length)]!;
      return `[@:s] **${randomKaomoji()} (${randMember.user!.username})**`;
    });
  }

  return result;
};

export const canDeleteMessage = (opts: { message?: Message }) => {
  if (!opts.message) return false;
  if (opts.message.state === "error") return true;
  const selfUserId = accountStore.currentUser?.id;
  if (selfUserId === opts.message.createdBy.id) return true;
  const currentServerId = serverStore.currentServerId;
  if (!currentServerId) return false;

  const member = serverMemberStore.getMember(currentServerId, selfUserId!);
  return member?.hasPerm(RolePermissionFlag.manageChannels.bit);
};
