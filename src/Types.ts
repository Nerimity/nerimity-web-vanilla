export interface RawFriend {
  id: string;
  status: number;
  userId: string;
  recipientId: string;
  createdAt: number;
  recipient: RawUser;
}

export interface RawServerMember {
  id: string;
  userId: string;
  serverId: string;
  roleIds: string[];
  user: RawUser;
  nickname?: string;
}

export interface RawServerRole {
  id: string;
  serverId: string;
  permissions: number;
  order: number;
  name: string;
  hideRole: boolean;
  hexColor?: string;
  icon?: string;
}

export const ChannelType = {
  DM_TEXT: 0,
  SERVER_TEXT: 1,
  CATEGORY: 2,
} as const;

export type ChannelType = (typeof ChannelType)[keyof typeof ChannelType];
export interface RawChannel {
  id: string;
  serverId?: string;
  name?: string;
  type: ChannelType;
  icon?: string;
  categoryId?: string;
  order?: number;
  permissions?: ChannelPermissions[];
  lastMessagedAt?: number;
}

export interface ChannelPermissions {
  permissions: number;
  roleId: string;
}

export interface RawServer {
  id: string;
  name: string;
  hexColor: string;
  defaultChannelId: string;
  defaultRoleId: string;
  createdById: string;
  avatar?: string;
  serverId: string;
  order?: number;
}
export interface RawUser {
  id: string;
  username: string;
  hexColor: string;
  avatar?: string;
  tag: string;
  profile?: Profile;
  banner?: string;
}

export interface RawUserPresence {
  status: number;
  userId: string;
  custom?: string;
}

export interface RawInbox {
  id: string;
  channelId: string;
  closed: boolean;
  createdAt: number;
  createdById: string;
  lastSeen: number;
  recipient: RawUser;
  recipientId: string;
}

// interface CustomEmoji {
//   id: string;
// }

export interface Profile {
  clan?: ServerClan;
}

export interface ServerClan {
  icon: string;
  serverId: string;
  tag: string;
}

export const MessageType = {
  CONTENT: 0,
};
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export interface RawMessage {
  id: string;
  content: string;
  channelId: string;
  createdBy: RawUser;
  createdAt: number;
  editedAt?: number;
  mentions?: RawUser[];
  attachments?: Attachment[];
  embed?: RawMessageEmbed;
  replyMessages?: RawReplyMessage[];
  type: MessageType;
  reactions?: RawMessageReaction[];
}

export interface RawMessageReaction {
  id: string;
  name: string;
  emojiId: string;
  gif: boolean;
  webp: boolean;
  messageId: string;
  reacted: boolean;
  count: number;
}

export interface PartialMessage {
  id: string;
  content?: string;
  createdAt: number;
  createdBy: RawUser;
  attachments?: Attachment[];
}
export interface RawReplyMessage {
  replyToMessage?: PartialMessage;
}

export interface RawMessageEmbed {
  type?: "image";
  animated?: boolean;
  imageMime?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageUrl?: string;
  domain?: string;
}

export interface Attachment {
  id: string;
  path?: string;
  mime?: string;

  width?: number;
  height?: number;
}

export interface RawMessageMention {
  channelId: string;
  serverId?: string;
  count: number;
  mentionedBy: RawUser;
}

export const NotificationMode = {
  ALL: 0,
  MENTIONS_ONLY: 1,
  MUTE: 2,
} as const;

export type NotificationMode =
  (typeof NotificationMode)[keyof typeof NotificationMode];

export interface RawUserNotificationSettings {
  notificationSoundMode: NotificationMode;
  notificationPingMode: NotificationMode;
  serverId?: string;
  channelId?: string;
}
