import type { RawChannel, RawInbox } from "../Types";
import { request } from "./request";

export const openInbox = async (userId: string) => {
  return request<RawInbox & { channel: RawChannel }>(
    `/users/${userId}/open-channel`,
    {
      useToken: true,
      method: "POST",
    },
  );
};
export const closeInbox = async (channelId: string) => {
  return request<{ status: true }>(`/channels/${channelId}`, {
    useToken: true,
    method: "DELETE",
  });
};
