import type { Inbox } from "../store/inboxStore";
import type { MessageMention } from "../store/messageMentionStore";
import type { Message, MessageReaction } from "../store/messageStore";
import type { UserPresence } from "../store/userPresenceStore";
import type { RawServer } from "../Types";

type WithId<T> = Omit<Partial<T>, "id"> & { id: string };

type StoreEvents = {
  "server:update": WithId<RawServer>;
  "server:members_fetched": { serverId: string };
  "ws:authStateUpdate": boolean;
  "ws:connectStateUpdate": boolean;
  "navigate:channelId": string | null;
  "navigate:serverId": string | null;
  "user:presence_update": { userId: string; presence?: UserPresence };
  "message:created": Message;
  "message:deleted": { id: string; channelId: string };
  "message:updated": { message: Message; index: number };
  "message_property:editing": { message?: Message; prevMessage?: Message };
  "message_property:replying": { replies: Message[] };
  "message:reaction_updated": { reaction: MessageReaction; message: Message };
  "drawer:pageVisible": number;
  "drawer:modeChange": "mobile" | "desktop";
  "drawer:toggleRightDesktop": boolean;
  "drawer:rightDrawerAvailable": boolean;
  "mention:dm_update": MessageMention;
  "channel:notify_update": { channelId: string; serverId?: string };
  "channel:scrolledToBottom": boolean;
  "inbox:open": Inbox;
  "channel:typing": { channelId: string; userId: string };
  "noti_settings:update": { channelId?: string; serverId?: string };
  "server:update_role": { roleId: string; serverId: string; hasRole: boolean };
  "server:member_update": { serverId: string; userId: string; isMe: boolean };
  recent_server_update: { serverId: string; channelId: string };
};

export const storeEmitter = createEventEmitter<StoreEvents>();

function createEventEmitter<T extends Record<string, unknown>>() {
  const listeners = new Map<keyof T, Set<(data: any) => void>>();

  const on = <K extends keyof T>(
    event: K | ReadonlyArray<K>,
    listener: (data: T[K]) => void,
    signal: AbortSignal,
  ) => {
    const events = Array.isArray(event) ? event : [event];
    for (const e of events) {
      if (!listeners.has(e)) listeners.set(e, new Set());
      listeners.get(e)!.add(listener);
    }
    const unsub = () => {
      for (const e of events) {
        listeners.get(e)?.delete(listener);
      }
    };
    signal.addEventListener("abort", unsub, { once: true });
  };

  const emit = <K extends keyof T>(event: K, data?: T[K]) => {
    listeners.get(event)?.forEach((l) => l(data));
  };

  return { on, emit };
}
