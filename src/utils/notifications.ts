import { t } from "@lingui/core/macro";

import { MessageTypes } from "../components/message-pane/SystemMessage";
import { accountStore } from "../store/accountStore";
import { channelStore } from "../store/channelStore";
import { serverMemberStore } from "../store/serverMemberStore";
import { serverStore } from "../store/serverStore";
import {
  userPresenceStore,
  UserPresenceType,
} from "../store/userPresenceStore";
import type { RawMessage } from "../Types";
import { buildImageUrl } from "./image";
import { userAgent } from "./userAgent";

export const handleMessageNotifications = (message: RawMessage) => {
  const messageCreator = message.createdBy;

  if (messageCreator.id === accountStore.currentUser?.id) return;

  const currentUserPresence = userPresenceStore.getCurrentUserPresence();
  if (currentUserPresence?.status === UserPresenceType.DO_NOT_DISTURB) return;

  handleServerNotification(message);
};

const handleServerNotification = (message: RawMessage) => {
  const channel = channelStore.channels.get(message.channelId);
  if (!channel?.serverId) return;
  const creator = message.createdBy;

  const server = serverStore.servers.get(channel.serverId);

  const [url] = buildImageUrl(server?.avatar, { size: 120 });

  const systemMessage = MessageTypes[message.type];
  const systemMessageEl = systemMessage?.Message(creator) as HTMLDivElement;
  const systemMessageText = systemMessageEl?.textContent;

  let title = "";
  let body: string | undefined = undefined;

  if (systemMessageText) {
    title = `#${channel.name} ~ ${server?.name}`;
    body = systemMessageText;
  } else {
    const member = serverMemberStore.getMember(server?.id!, creator.id);
    const username = member?.nickname || creator.username;
    title = `@${username} ~ #${channel.name} ~ ${server?.name}`;
    const attachmentMessage = message.attachments?.length;
    body = attachmentMessage ? t`Attachment` : message.content;
  }

  new Notification(title, {
    silent: true,
    body,
    tag: userAgent.mobile ? channel.id : undefined,

    icon: url || undefined,
  });
};
