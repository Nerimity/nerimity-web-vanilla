import { accountStore } from "../../store/accountStore";

import { type Message } from "../../store/messageStore";
import { serverStore } from "../../store/serverStore";
import { MessageType } from "../../Types";

export const shouldGroup = (message: Message, prev?: Message): boolean => {
  if (!prev) return false;
  if (message.createdBy.id !== prev.createdBy.id) return false;
  if (message.replyMessages?.length) return false;
  const diff = message.createdAt - prev.createdAt;
  if (diff > 5 * 60 * 1000) return false;
  if (prev.type !== MessageType.CONTENT) return false;
  if (message.type !== MessageType.CONTENT) return false;
  return true;
};

const MS_PER_DAY = 86400000;
const TZ_OFFSET = new Date().getTimezoneOffset() * 60000;

export const isNewDay = (message: Message, prev?: Message) => {
  if (!prev) return true;
  const prevLocal = prev.createdAt - TZ_OFFSET;
  const prevMidnight = prevLocal - (prevLocal % MS_PER_DAY);
  return message.createdAt - TZ_OFFSET >= prevMidnight + MS_PER_DAY;
};

export const getLastSeenMessage = (channelId: string, messages: Message[]) => {
  const lastSeenAt = serverStore.lastSeenChannelIds.get(channelId);
  const selfUserId = accountStore.currentUser?.id;
  if (!lastSeenAt) return null;
  const message = messages.find((m) => {
    if (m.createdBy.id === selfUserId) return false;
    return m.createdAt - lastSeenAt >= 0;
  });
  return message || null;
};
