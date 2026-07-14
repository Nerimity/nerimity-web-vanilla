import { openInbox } from "../services/inboxService";
import type { RawInbox } from "../Types";
import { storeEmitter } from "../utils/EventEmitter";
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
      inboxes.set(inbox.channelId, new Inbox(inbox));
    }
  };

  const setInbox = (inbox: RawInbox) => {
    userStore.addUser(inbox.recipient);
    const newInbox = new Inbox(inbox);
    inboxes.set(inbox.channelId, newInbox);
    storeEmitter.emit("inbox:open", inbox);
    return newInbox;
  };
  const removeInbox = (channelId: string) => {
    const inbox = inboxes.get(channelId)!;
    inboxes.delete(channelId);
    storeEmitter.emit("inbox:close", inbox);
  };

  const loadInbox = async (userId: string) => {
    const [inbox, error] = await openInbox(userId);
    if (error) {
      alert(error.message);
      return;
    }
    const newInbox = setInbox(inbox);
    return newInbox;
  };

  return { inboxes, setInboxes, setInbox, loadInbox, removeInbox };
}
