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

export interface RawServerFolder {
  id: string;
  serverIds: string[];
  color: string;
  name: string;
}

export interface RawServer {
  id: string;
  name: string;
  hexColor: string;
  defaultChannelId: string;
  defaultRoleId: string;
  createdById: string;
  createdAt: number;
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
  bot?: boolean;
}

export interface RawUserPresence {
  status: number;
  userId: string;
  custom?: string;
  activities?: RawUserActivity[];
}

export interface RawUserActivity {
  action: string;
  name: string;
  startedAt: number;
  endsAt?: number;
  speed?: number;
  updatedAt?: number;

  imgSrc?: string;
  title?: string;
  subtitle?: string;
  link?: string;
  emoji?: string;
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
  bgColorOne?: string;
  bgColorTwo?: string;
  bio?: string;
  font?: number;
  primaryColor?: string;
}

export interface ServerClan {
  icon: string;
  serverId: string;
  tag: string;
}

export const MessageType = {
  CONTENT: 0,
  JOIN_SERVER: 1,
  LEAVE_SERVER: 2,
  KICK_USER: 3,
  BAN_USER: 4,
  CALL_STARTED: 5,
  BUMP_SERVER: 6,
  PINNED_MESSAGE: 7,
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
  title?: string;
  type?: string;
  description?: string;
  url: string;
  origUrl?: string;
  imageUrl?: string;
  imageWidth?: number;
  animated?: boolean;
  imageHeight?: number;
  imageMime?: string;

  video?: boolean;
  largeImage?: boolean;

  // for youtube
  uploadDate: string;
  channelName: string;
  domain: string;
}

export interface Attachment {
  id: string;
  path?: string;
  mime?: string;

  width?: number;
  height?: number;
  filesize?: number;
  expireAt?: number;
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
