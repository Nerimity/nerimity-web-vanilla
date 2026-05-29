import { request } from "./request";

export const postTyping = async (channelId: string) => {
  return request(`/channels/${channelId}/typing`, {
    useToken: true,
    method: "POST",
    text: true,
  });
};
