import { t } from "@lingui/core/macro";
import type { RawUserPresence } from "../Types";
import { storeEmitter } from "../utils/EventEmitter";

export const UserPresenceType = {
  OFFLINE: 0,
  ONLINE: 1,
  LOOKING_TO_PLAY: 2,
  AWAY_FROM_KEYBOARD: 3,
  DO_NOT_DISTRUB: 4,
} as const;

export const UserPresenceDetails = {
  [UserPresenceType.OFFLINE]: {
    id: "offline",
    text: t`Offline`,
  },
  [UserPresenceType.ONLINE]: {
    id: "online",
    text: t`Online`,
  },
  [UserPresenceType.LOOKING_TO_PLAY]: {
    id: "looking-to-play",
    text: t`Looking to play`,
  },
  [UserPresenceType.AWAY_FROM_KEYBOARD]: {
    id: "away-from-keyboard",
    text: t`Away from keyboard`,
  },
  [UserPresenceType.DO_NOT_DISTRUB]: {
    id: "do-not-distrub",
    text: t`Do not distrub`,
  },
} as const;

export const userPresenceStore = createPresenceStore();

export class UserPresence {
  userId: string;
  status: (typeof UserPresenceType)[keyof typeof UserPresenceType];
  custom?: string;
  constructor(data: RawUserPresence) {
    this.userId = data.userId;
    this.status =
      data.status as (typeof UserPresenceType)[keyof typeof UserPresenceType];
    this.custom = data.custom;
  }
}

function createPresenceStore() {
  const presences = new Map<string, UserPresence>();

  const setPresences = (newPresences: RawUserPresence[]) => {
    presences.clear();
    for (let i = 0; i < newPresences.length; i++) {
      const presence = newPresences[i]!;
      console.log(presence);
      presences.set(presence.userId, new UserPresence(presence));
    }
  };

  const updatePresence = (userId: string, presence: RawUserPresence) => {
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

  return { presences, setPresences, updatePresence };
}
