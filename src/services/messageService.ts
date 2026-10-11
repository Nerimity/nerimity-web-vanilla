import type { RawMessage, RawUser } from "../Types";
import { newQueue } from "../utils/queue";
import { request } from "./request";

const fetchMessagesQueue = newQueue();

export const fetchMessages = async (
  channelId: string,
  opts?: { before?: string; after?: string; around?: string },
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
    return request<RawMessage, { slowMode?: boolean; ttl?: number }>(
      `/channels/${channelId}/messages`,
      {
        useToken: true,
        method: "POST",
        body,
      },
    );
  });
};

interface AddReactionBody {
  emojiId?: string | null;
  name?: string;

  webp?: boolean;
  gif?: boolean;
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
  emojiId?: string | null;
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

export interface ReactedUser {
  reactedAt: number;
  user: RawUser;
}
export const reactedUsers = async (opts: {
  channelId: string;
  messageId: string;
  name: string;
  limit: number;
  emojiId?: string;
}) => {
  return request<ReactedUser[]>(
    `/channels/${opts.channelId}/messages/${opts.messageId}/reactions/users`,
    {
      useToken: true,
      method: "GET",
      params: {
        name: opts.name,
        limit: opts.limit,
        emojiId: opts.emojiId,
      },
    },
  );
};
