import type {
  Profile,
  RawBotCommand,
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

interface UpdateUserOptions {
  email?: string;
  username?: string;
  avatarId?: string;
  bannerId?: string;
  tag?: string;
  password?: string;
  newPassword?: string;
  bio?: string | null;
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
