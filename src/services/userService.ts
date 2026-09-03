import type {
  Profile,
  RawBotCommand,
  RawInventoryItem,
  RawUser,
  RawUserPresence,
} from "../Types";
import { request } from "./request";

interface GetUserDetailsOpts {
  userId: string;
}

export type UserDetails = {
  blocked: boolean;
  followsYou: boolean;
  hideFollowers: boolean;
  hideFollowing: boolean;
  profile?: Profile;
  mutualFriendIds: string[];
  mutualServerIds: string[];
  user: RawUser & {
    application?: {
      botCommands?: RawBotCommand[];
      creatorAccount: {
        user: {
          username: string;
          tag: string;
          id: string;
          avatar?: string;
          badges: number;
          hexColor: string;
        };
      };
    };
    following: any[];
    followers: any[];
    _count: {
      followers: number;
      following: number;
      likedPosts: number;
      posts: number;
    };
  };
};

export const getUserDetails = async (opts: GetUserDetailsOpts) => {
  return request<UserDetails>(`/users/${opts.userId}`, {
    method: "GET",
    useToken: true,
  });
};
export const userLogout = async () => {
  return request<any>(`/users/logout`, {
    method: "DELETE",
    useToken: true,
  });
};

export async function updatePresence(presence: Partial<RawUserPresence>) {
  return request("/users/presence", {
    method: "POST",
    body: presence,
    useToken: true,
  });
}

export async function followUser(userId: string) {
  return request(`/users/${userId}/follow`, {
    method: "POST",
    useToken: true,
  });
}

export async function unfollowUser(userId: string) {
  return request(`/users/${userId}/follow`, {
    method: "DELETE",
    useToken: true,
  });
}

export async function dismissNotice(noticeId: string) {
  return request(`/users/notices/${noticeId}`, {
    method: "DELETE",
    useToken: true,
  });
}

export interface UpdateUserOptions {
  email?: string;
  username?: string;
  avatarId?: string;
  bannerId?: string;
  tag?: string;
  password?: string;
  newPassword?: string;
  bio?: string | null;
  clanServerId?: string | null;
  bgColorOne?: string | null;
  bgColorTwo?: string | null;
  primaryColor?: string | null;
  font?: number | null;
  socketId?: string;
  dmStatus?: number;
  friendRequestStatus?: number;
  lastOnlineStatus?: number;
  hideFollowers?: boolean;
  hideFollowing?: boolean;
}

export async function updateUser(body: UpdateUserOptions) {
  return request<{ user: any; newToken?: string }>(`/users`, {
    method: "POST",
    useToken: true,
    body,
  });
}

export async function postResetPassword(email: string) {
  return request<{ message: string }>(`/users/reset-password/send-code`, {
    method: "POST",
    useToken: true,
    body: { email },
  });
}

export const getUserChannelNotice = async () => {
  return request<{ notice: { content: string } }>(`/users/channel-notice`, {
    useToken: true,
    method: "GET",
  });
};
export const updateUserChannelNotice = async (content: string) => {
  return request<{ notice: { content: string } }>(`/users/channel-notice`, {
    useToken: true,
    method: "PUT",
    body: { content },
  });
};
export const deleteUserChannelNotice = async () => {
  return request<{ notice: { content: string } }>(`/users/channel-notice`, {
    useToken: true,
    method: "DELETE",
  });
};
export const deleteAccount = async (opts: {
  password: string;
  deleteContent: boolean;
}) => {
  return request(`/users/delete-account`, {
    useToken: true,
    method: "DELETE",
    body: opts,
  });
};

export const DeviceType = {
  Browser: 0,
  Desktop: 1,
  Mobile: 2,
} as const;

export type DeviceTypeId = (typeof DeviceType)[keyof typeof DeviceType];

export interface UserSession {
  lastSeenAt: number;
  location: string;
  sessionId: string;
  deviceType: DeviceTypeId;
}
export const getSessions = async () => {
  return request<UserSession[]>(`/users/sessions`, {
    useToken: true,
    method: "GET",
  });
};

export const destroySession = async (password: string, sessionId?: string) => {
  return request(`/users/sessions/${sessionId || ""}`, {
    useToken: true,
    body: { password },
    method: "DELETE",
  });
};
export const getInventory = async () => {
  return request<RawInventoryItem[]>(`/users/inventory`, {
    useToken: true,
    method: "GET",
  });
};
export const toggleBadge = async (bit: number) => {
  return request<{ badges: number }>(`/users/badges/toggle`, {
    useToken: true,
    body: { bit },
    method: "POST",
  });
};
