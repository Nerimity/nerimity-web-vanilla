export interface RawServerMember {
  id: string;
  userId: string;
  serverId: string;
  roleIds: string[];
  user: RawUser;
}

export interface RawServerRole {
  id: string;
  serverId: string;
  permissions: number;
  order: number;
  name: string;
  hideRole: boolean;
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
}

export interface RawUserPresence {
  status: number;
  userId: string;
}

// interface CustomEmoji {
//   id: string;
// }
