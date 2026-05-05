import type { RawServer } from "./Types";

type WithId<T> = Omit<Partial<T>, "id"> & { id: string };

type StoreEvents = {
  "server:update": WithId<RawServer>;
  "user:authenticated": void;
};

export const storeEmitter = createEventEmitter<StoreEvents>();

function createEventEmitter<T extends Record<string, unknown>>() {
  const listeners = new Map<keyof T, Set<(data: any) => void>>();

  return {
    on<K extends keyof T>(event: K, listener: (data: T[K]) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener);
      return () => listeners.get(event)?.delete(listener);
    },
    emit<K extends keyof T>(event: K, data?: T[K]) {
      listeners.get(event)?.forEach((l) => l(data));
    },
  };
}
