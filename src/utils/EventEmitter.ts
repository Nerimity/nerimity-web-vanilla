import type { Message } from "../store/messageStore";
import type { UserPresence } from "../store/userPresenceStore";
import type { RawServer } from "../Types";

type WithId<T> = Omit<Partial<T>, "id"> & { id: string };

type StoreEvents = {
  "server:update": WithId<RawServer>;
  "user:authenticated": void;
  "navigate:channelId": string | null;
  "navigate:serverId": string | null;
  "user:presence_update": { userId: string; presence?: UserPresence };
  "message:created": Message;
  "message:deleted": { id: string; channelId: string };
  "message:updated": { message: Message; index: number };
  "drawer:pageVisible": number;
  "drawer:modeChange": "mobile" | "desktop";
};

export const storeEmitter = createEventEmitter<StoreEvents>();

function createEventEmitter<T extends Record<string, unknown>>() {
  const listeners = new Map<keyof T, Set<(data: any) => void>>();

  const on = <K extends keyof T>(
    event: K | ReadonlyArray<K>,
    listener: (data: T[K]) => void,
  ) => {
    const events = Array.isArray(event) ? event : [event];
    for (const e of events) {
      if (!listeners.has(e)) listeners.set(e, new Set());
      listeners.get(e)!.add(listener);
    }
    return () => {
      for (const e of events) {
        listeners.get(e)?.delete(listener);
      }
    };
  };

  const emit = <K extends keyof T>(event: K, data?: T[K]) => {
    listeners.get(event)?.forEach((l) => l(data));
  };

  return { on, emit };
}
