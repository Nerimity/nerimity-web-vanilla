import type { RawInbox } from "../Types";
import { userStore } from "./userStore";

export const inboxStore = createInboxStore();

export class Inbox {
  id: string;
  channelId: string;
  createdAt: number;
  recipientId: string;
  lastSeen: number;
  constructor(data: RawInbox) {
    this.id = data.id;
    this.channelId = data.channelId;
    this.createdAt = data.createdAt;
    this.recipientId = data.recipientId;
    this.lastSeen = data.lastSeen;
  }
}

function createInboxStore() {
  const inboxes = new Map<string, Inbox>();

  const setInboxes = (newInboxes: RawInbox[]) => {
    inboxes.clear();
    for (let i = 0; i < newInboxes.length; i++) {
      const inbox = newInboxes[i]!;
      if (inbox.closed) continue;
      userStore.addUser(inbox.recipient);
      inboxes.set(inbox.id, new Inbox(inbox));
    }
  };

  return { inboxes, setInboxes };
}
