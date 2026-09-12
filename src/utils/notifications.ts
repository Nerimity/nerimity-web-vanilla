import { t } from "@lingui/core/macro";

import { MessageTypes } from "../components/message-pane/SystemMessage";
import { isMentioned } from "../components/message-pane/utils";
import { accountStore } from "../store/accountStore";
import { Channel, channelStore } from "../store/channelStore";
import { serverMemberStore } from "../store/serverMemberStore";
import { serverStore } from "../store/serverStore";
import {
  userPresenceStore,
  UserPresenceType,
} from "../store/userPresenceStore";
import { NotificationMode, type RawMessage } from "../Types";
import { buildImageUrl } from "./image";
import { getLocalItem } from "./localStorage";
import { playSoundByType } from "./sounds";
import { userAgent } from "./userAgent";

export const handleMessageNotifications = (message: RawMessage) => {
  const messageCreator = message.createdBy;

  if (messageCreator.id === accountStore.currentUser?.id) return;

  const currentUserPresence = userPresenceStore.getCurrentUserPresence();
  if (currentUserPresence?.status === UserPresenceType.DO_NOT_DISTURB) return;

  const channel = channelStore.channels.get(message.channelId);

  if (channel?.serverId) {
    return handleServerNotification(message, channel);
  }
  handleDMNotification(message);
};

const handleDMNotification = (message: RawMessage) => {
  const creator = message.createdBy;

  handleNotificationSound();

  if (!getLocalItem("desktopNotification")) return;

  const [url] = buildImageUrl(creator.avatar, { size: 120 });

  const systemMessage = MessageTypes[message.type];
  const systemMessageEl = systemMessage?.Message(creator) as HTMLDivElement;
  const systemMessageText = systemMessageEl?.textContent;

  let body: string | undefined = undefined;

  if (systemMessageText) {
    body = systemMessageText;
  } else {
    body = formatMessage(message);
  }

  new Notification(`@${creator.username}`, {
    silent: true,
    body,
    tag: userAgent.mobile ? message.channelId : undefined,

    icon: url || undefined,
  });
};

const handleServerNotification = (message: RawMessage, channel: Channel) => {
  if (!channel.serverId) return;
  const creator = message.createdBy;

  const modes = accountStore.getCombinedNotification(
    channel.serverId,
    channel.id,
  );
  const pingMode = modes?.notificationPingMode;
  const soundMode = modes?.notificationSoundMode;

  if (pingMode === NotificationMode.MUTE) return;

  const server = serverStore.servers.get(channel.serverId);
  const member = serverMemberStore.getMember(server?.id!, creator.id);

  const mentioned = isMentioned({
    message,
    member,
    server,
  });

  if (pingMode === NotificationMode.MENTIONS_ONLY) {
    if (!mentioned) return;
  }

  if (soundMode === NotificationMode.MUTE) return;
  if (soundMode === NotificationMode.MENTIONS_ONLY && !mentioned) return;

  handleNotificationSound(mentioned);

  if (!getLocalItem("desktopNotification")) return;

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
    const username = member?.nickname || creator.username;
    title = `@${username} ~ #${channel.name} ~ ${server?.name}`;
    body = formatMessage(message);
  }

  new Notification(title, {
    silent: true,
    body,
    tag: userAgent.mobile ? channel.id : undefined,

    icon: url || undefined,
  });
};

const UserMentionRegex = /\[@:(.*?)\]/g;
const RoleMentionRegex = /\[r:(.*?)\]/g;
const CustomEmojiRegex = /\[(?:ce|ace|wace):(.*?):(.*?)\]/g;
const commandRegex = /^(\/[^:\s]*):\d+( .*)?$/m;

function formatMessage(message: RawMessage) {
  const content = message.content;

  const attachmentMessage = message.attachments?.length;

  if (!content && attachmentMessage) {
    return t`Attachment`;
  }

  if (!content) return;

  const mentionReplace = content.replace(UserMentionRegex, (_, id) => {
    const user = message.mentions?.find((m) => m.id === id);
    return user ? `@${user.username}` : _;
  });

  const roleReplace = mentionReplace.replace(RoleMentionRegex, (_, id) => {
    const role = message.roleMentions?.find((m) => m.id === id);
    return role ? `@${role.name}` : _;
  });

  const cEmojiReplace = roleReplace.replace(CustomEmojiRegex, (_, __, p2) => {
    return `:${p2}:`;
  });

  const commandReplace = cEmojiReplace.replace(commandRegex, "$1$2");

  return commandReplace;
}

const handleNotificationSound = (mentioned?: boolean) => {
  playSoundByType(mentioned ? "MESSAGE_MENTION" : "MESSAGE");
};
