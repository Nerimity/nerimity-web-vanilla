export interface RawServerMember {
  id: string;
  userId: string;
  serverId: string;
  roleIds: string[];
}

export interface ServerRole {
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

type ChannelType = (typeof ChannelType)[keyof typeof ChannelType];
export interface Channel {
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
}
export interface User {
  id: string;
  username: string;
  hexColor: string;
  avatar?: string;
}

export interface UserPresence {
  status: number;
  userId: string;
}

// interface CustomEmoji {
//   id: string;
// }
