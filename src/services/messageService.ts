import type { RawMessage } from "../Types";
import { newQueue } from "../utils/queue";
import { request } from "./request";

const fetchMessagesQueue = newQueue();

export const fetchMessages = async (
  channelId: string,
  opts?: { before?: string; after?: string },
) => {
  return fetchMessagesQueue.add(() => {
    return request<RawMessage[]>(`/channels/${channelId}/messages`, {
      useToken: true,
      params: opts,
    });
  });
};

const postMessagesQueue = newQueue();

interface PostMessageBody {
  content?: string;
  socketId?: string;
  replyToMessageIds?: string[];
  mentionReplies?: boolean;
  nerimityCdnFileId?: string;
  silent?: boolean;
}
export const postMessage = async (channelId: string, body: PostMessageBody) => {
  return postMessagesQueue.add(() => {
    return request<RawMessage>(`/channels/${channelId}/messages`, {
      useToken: true,
      method: "POST",
      body,
    });
  });
};

interface AddReactionBody {
  emojiId?: string;
  name?: string;
}
export const addReaction = async (
  channelId: string,
  messageId: string,
  body: AddReactionBody,
) => {
  return request<any>(
    `/channels/${channelId}/messages/${messageId}/reactions`,
    {
      useToken: true,
      method: "POST",
      body,
    },
  );
};
interface RemoveReactionBody {
  emojiId?: string;
  name?: string;
}
export const removeReaction = async (
  channelId: string,
  messageId: string,
  body: RemoveReactionBody,
) => {
  return request<any>(
    `/channels/${channelId}/messages/${messageId}/reactions/remove`,
    {
      useToken: true,
      method: "POST",
      body,
    },
  );
};

export const patchEditMessage = async (
  channelId: string,
  messageId: string,
  content: string,
) => {
  return postMessagesQueue.add(() => {
    return request<RawMessage>(`/channels/${channelId}/messages/${messageId}`, {
      useToken: true,
      method: "PATCH",
      body: { content },
    });
  });
};

export const deleteMessage = async (channelId: string, messageId: string) => {
  return request(`/channels/${channelId}/messages/${messageId}`, {
    useToken: true,
    method: "DELETE",
  });
};
