import type { RawUserPresence } from "../Types";
import { storeEmitter } from "../utils/EventEmitter";

export const userPresenceStore = createPresenceStore();

export class UserPresence {
  userId: string;
  status: number;
  constructor(data: RawUserPresence) {
    this.userId = data.userId;
    this.status = data.status;
  }
}

function createPresenceStore() {
  const presences = new Map<string, UserPresence>();

  const setPresences = (newPresences: RawUserPresence[]) => {
    presences.clear();
    for (let i = 0; i < newPresences.length; i++) {
      const presence = newPresences[i]!;
      presences.set(presence.userId, new UserPresence(presence));
    }
  };

  const updatePresence = (userId: string, presence: RawUserPresence) => {
    if (presence.status === 0) {
      presences.delete(userId);
      storeEmitter.emit("user:presence_update", { userId });
      return;
    }
    const newPresence = new UserPresence(presence);
    presences.set(userId, newPresence);
    storeEmitter.emit("user:presence_update", {
      userId,
      presence: newPresence,
    });
  };

  return { presences, setPresences, updatePresence };
}
