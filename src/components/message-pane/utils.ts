import type { Message } from "../../store/messageStore";

export const shouldGroup = (message: Message, prev?: Message): boolean => {
  if (!prev) return false;
  if (message.createdBy.id !== prev.createdBy.id) return false;
  const diff = message.createdAt - prev.createdAt;
  if (diff > 5 * 60 * 1000) return false;
  return true;
};
