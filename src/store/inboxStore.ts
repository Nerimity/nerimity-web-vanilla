import { alert } from "../components/modal";
import { closeInbox, openInbox } from "../services/inboxService";
import type { RawInbox } from "../Types";
import { storeEmitter } from "../utils/EventEmitter";
import { router } from "../utils/router";
import { channelStore } from "./channelStore";
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
      const user = userStore.addUser(inbox.recipient);
      user.inboxChannelId = inbox.channelId;
      inboxes.set(inbox.channelId, new Inbox(inbox));
    }
  };

  const setInbox = (inbox: RawInbox) => {
    const user = userStore.addUser(inbox.recipient);
    user.inboxChannelId = inbox.channelId;
    const newInbox = new Inbox(inbox);
    inboxes.set(inbox.channelId, newInbox);
    storeEmitter.emit("inbox:open", inbox);
    return newInbox;
  };
  const removeInbox = (channelId: string) => {
    const inbox = inboxes.get(channelId)!;

    const user = userStore.users.get(inbox.recipientId);
    if (user) {
      user.inboxChannelId = undefined;
    }

    inboxes.delete(channelId);
    storeEmitter.emit("inbox:close", inbox);
  };

  const loadInbox = async (userId: string) => {
    const [inbox, error] = await openInbox(userId);
    if (error) {
      alert({ message: error.message });

      return;
    }
    const newInbox = setInbox(inbox);
    return newInbox;
  };
  const close = async (channelId: string) => {
    const [, error] = await closeInbox(channelId);
    if (error) {
      alert({ message: error.message });
      return;
    }
    if (channelStore.currentChannelId === channelId) {
      router.navigate("/app", { replace: true });
    }
    removeInbox(channelId);
  };

  let dmOpening = false;
  const openChannel = async (userId: string) => {
    const user = userStore.users.get(userId);
    let inbox = inboxes.get(user?.inboxChannelId!);
    if (!inbox) {
      if (dmOpening) return;
      dmOpening = true;

      inbox = await inboxStore.loadInbox(userId).finally(() => {
        dmOpening = false;
      });
      if (!inbox) return;
    }
    router.navigate(`/app/inbox/${inbox.channelId}`);
  };

  return {
    inboxes,
    setInboxes,
    setInbox,
    loadInbox,
    removeInbox,
    close,
    openChannel,
  };
}
