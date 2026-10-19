import type { RawFriend } from "../Types";
import { request } from "./request";

export const addFriend = async (opts: { username: string; tag: string }) => {
  return request<RawFriend>(`/friends/add`, {
    useToken: true,
    method: "POST",
    body: opts,
  });
};

export const acceptFriend = async (opts: { userId: string }) => {
  return request<{ message: string }>(`/friends/${opts.userId}`, {
    useToken: true,
    method: "POST",
    body: opts,
  });
};

export const removeFriend = async (userId: string) => {
  return request<{ message: string }>(`/friends/${userId}`, {
    useToken: true,
    method: "DELETE",
  });
};
