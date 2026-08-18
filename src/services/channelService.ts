import type { FullAttachment } from "../Types";
import { newQueue } from "../utils/queue";
import { request } from "./request";

export const postTyping = async (channelId: string) => {
  return request(`/channels/${channelId}/typing`, {
    useToken: true,
    method: "POST",
    text: true,
  });
};
export const getAttachments = async (channelId: string) => {
  return request<FullAttachment[]>(
    `/channels/${channelId}/attachments?limit=50`,
    {
      useToken: true,
      method: "GET",
    },
  );
};

const getChannelNotice = async (channelId: string) => {
  return request<{ notice: { content: string } }>(
    `/channels/${channelId}/notice`,
    {
      useToken: true,
      method: "GET",
    },
  );
};

const noticeQueue = newQueue();
const notices = new Map<string, string | null>();
const MAX_CACHE_SIZE = 20;

const touch = (channelId: string, value: string | null) => {
  notices.delete(channelId);
  notices.set(channelId, value);

  if (notices.size > MAX_CACHE_SIZE) {
    const oldestKey = notices.keys().next().value;
    if (oldestKey !== undefined) notices.delete(oldestKey);
  }
};

export const getOrCacheChannelNotice = (channelId: string) => {
  return noticeQueue.add(async () => {
    const cachedNotice = notices.get(channelId);
    if (cachedNotice || cachedNotice === null) {
      touch(channelId, cachedNotice);
      return cachedNotice;
    }

    const [result] = await getChannelNotice(channelId);

    const content = result?.notice.content || null;
    touch(channelId, content);

    return content;
  });
};
