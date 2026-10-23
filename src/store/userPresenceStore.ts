import { t } from "@lingui/core/macro";

import type { RawUserActivity, RawUserPresence } from "../Types";
import { storeEmitter } from "../utils/EventEmitter";
import { accountStore } from "./accountStore";

export const UserPresenceType = {
  OFFLINE: 0,
  ONLINE: 1,
  LOOKING_TO_PLAY: 2,
  AWAY_FROM_KEYBOARD: 3,
  DO_NOT_DISTURB: 4,
} as const;

export const UserPresenceDetails = {
  [UserPresenceType.ONLINE]: {
    id: "ONLINE",
    get text() {
      return t`Online`;
    },
  },
  [UserPresenceType.LOOKING_TO_PLAY]: {
    id: "LOOKING_TO_PLAY",
    get text() {
      return t`Looking to Play`;
    },
  },
  [UserPresenceType.AWAY_FROM_KEYBOARD]: {
    id: "AWAY_FROM_KEYBOARD",
    get text() {
      return t`Away From Keyboard`;
    },
  },
  [UserPresenceType.DO_NOT_DISTURB]: {
    id: "DO_NOT_DISTURB",
    get text() {
      return t`Do Not Disturb`;
    },
  },
  [UserPresenceType.OFFLINE]: {
    id: "OFFLINE",
    get text() {
      return t`Offline`;
    },
  },
} as const;

export const userPresenceStore = createPresenceStore();

export class UserPresence {
  userId: string;
  status: (typeof UserPresenceType)[keyof typeof UserPresenceType];
  custom?: string;
  activities?: RawUserActivity[];
  constructor(data: RawUserPresence) {
    this.userId = data.userId;
    this.status =
      data.status as (typeof UserPresenceType)[keyof typeof UserPresenceType];
    this.custom = data.custom;
    this.activities = data.activities;
  }
}

function createPresenceStore() {
  const presences = new Map<string, UserPresence>();

  const setPresences = (newPresences: RawUserPresence[], clear = true) => {
    if (clear) presences.clear();
    for (let i = 0; i < newPresences.length; i++) {
      const presence = newPresences[i]!;
      presences.set(presence.userId, new UserPresence(presence));
    }
  };

  const updatePresence = (
    userId: string,
    presence: Partial<RawUserPresence>,
  ) => {
    if (presence.status === 0) {
      presences.delete(userId);
      storeEmitter.emit("user:presence_update", { userId });
      return;
    }
    const existing = presences.get(userId)!;
    const newPresence = new UserPresence({
      ...existing,
      ...presence,
    });
    presences.set(userId, newPresence);
    storeEmitter.emit("user:presence_update", {
      userId,
      presence: newPresence,
    });
  };

  const getCurrentUserPresence = () => {
    const userId = accountStore.currentUser?.id;
    if (!userId) return;
    return presences.get(userId);
  };

  return { presences, setPresences, updatePresence, getCurrentUserPresence };
}
