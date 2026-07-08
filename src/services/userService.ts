import type { Profile, RawUser } from "../Types";
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
  user: RawUser & {
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
  });
};
export const userLogout = async () => {
  return request<any>(`/users/logout`, {
    method: "DELETE",
  });
};
