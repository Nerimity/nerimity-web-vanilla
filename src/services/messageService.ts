import type { RawMessage } from "../Types";
import { request } from "./request";

export const fetchMessages = async (channelId: string) => {
  return request<RawMessage[]>(`/channels/${channelId}/messages`, {
    useToken: true,
  });
};

interface PostMessageBody {
  content: string;
  socketId?: string;
}
export const postMessage = async (channelId: string, body: PostMessageBody) => {
  return request<RawMessage>(`/channels/${channelId}/messages`, {
    useToken: true,
    method: "POST",
    body,
  });
};
