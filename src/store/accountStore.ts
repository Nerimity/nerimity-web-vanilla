import { t } from "@lingui/core/macro";

import { postNotificationSettings } from "../services/userService";
import {
  FriendStatus,
  NotificationMode,
  type RawNotice,
  type RawServerFolder,
  type RawUserNotificationSettings,
} from "../Types";
import { Collection } from "../utils/Collection";
import { storeEmitter } from "../utils/EventEmitter";
import { channelStore } from "./channelStore";
import { friendStore } from "./friendStore";
import { messageMentionStore } from "./messageMentionStore";
import { serverStore } from "./serverStore";
import { User } from "./userStore";

export const accountStore = createAccountStore();

export const LastOnlineStatus = {
  HIDDEN: 0,
  FRIENDS: 1,
  FRIENDS_AND_SERVERS: 2,
} as const;

export type LastOnlineStatus =
  (typeof LastOnlineStatus)[keyof typeof LastOnlineStatus];

export const DmStatus = {
  OPEN: 0,
  FRIENDS_AND_SERVERS: 1,
  FRIENDS: 2,
} as const;

export type DmStatus = (typeof DmStatus)[keyof typeof DmStatus];

export const FriendRequestStatus = {
  OPEN: 0,
  SERVERS: 1,
  CLOSED: 2,
} as const;

export type FriendRequestStatus =
  (typeof FriendRequestStatus)[keyof typeof FriendRequestStatus];

export type CurrentUser = User & {
  orderedServerIds: string[];
  serverFolders: RawServerFolder[];
  notices: RawNotice[];
  email?: string;
  emailConfirmed: boolean;
  dmStatus: DmStatus;
  friendRequestStatus: FriendRequestStatus;
  lastOnlineStatus?: number;
  hideFollowers: boolean;
  hideFollowing: boolean;
};

function createAccountStore() {
  let sessionId = "";
  let connected = false;
  let authenticated = false;
  let authError: {
    message: string;
    data?:
      | {
          type: "suspend";
          reason: string;
          expire: number;
          by: { username: string };
        }
      | {
          type: "ip-ban";
          expire: number;
        };
  } | null = null;

  let currentUser: CurrentUser | null = null;
  let notificationSettings = new Collection<
    string,
    RawUserNotificationSettings
  >();

  const setNotificationSettings = (
    newSettings: RawUserNotificationSettings[],
  ) => {
    notificationSettings.clear();
    for (let i = 0; i < newSettings.length; i++) {
      const setting = newSettings[i]!;
      const serverOrChannelId = setting.serverId || setting.channelId!;
      notificationSettings.set(serverOrChannelId, {
        notificationPingMode: setting.notificationPingMode,
        notificationSoundMode: setting.notificationSoundMode,
        channelId: setting.channelId,
        serverId: setting.serverId,
      });
    }
  };

  const updateNotificationSetting = (
    updated: Partial<RawUserNotificationSettings>,
  ) => {
    const serverOrChannelId = updated.serverId || updated.channelId!;

    notificationSettings.set(serverOrChannelId, {
      ...notificationSettings.get(serverOrChannelId)!,
      ...updated,
    });
    channelStore.notificationsMemo.rerun();
    serverStore.notificationsMemo.rerun();
    storeEmitter.emit("noti_settings:update", {
      channelId: updated.channelId,
      serverId: updated.serverId,
    });
  };

  const getCombinedNotification = (serverId: string, channelId: string) => {
    const channelNotification = notificationSettings.get(channelId);
    const serverNotification = notificationSettings.get(serverId);

    if (!channelNotification) return serverNotification;

    const serverSoundMode = serverNotification?.notificationSoundMode;
    const channelSoundMode = channelNotification?.notificationSoundMode;

    const serverPingMode = serverNotification?.notificationPingMode;
    const channelPingMode = channelNotification?.notificationPingMode;

    return {
      ...channelNotification,
      ...serverNotification,
      notificationPingMode: channelPingMode ?? serverPingMode,
      notificationSoundMode: channelSoundMode ?? serverSoundMode,
    };
  };

  const updateUserNotificationSettings = (opts: {
    serverId?: string;
    channelId?: string;
    pingMode?: number | null;
    soundMode?: number | null;
  }) => {
    const id = opts.serverId || opts.channelId!;

    const currentSoundMode =
      notificationSettings.get(id)?.notificationSoundMode ??
      (opts.channelId ? null : 0);

    if (opts.soundMode !== undefined) {
      return postNotificationSettings({
        serverId: opts.serverId,
        channelId: opts.channelId,
        notificationSoundMode: opts.soundMode,
      });
    }

    let newSoundMode: number | null | undefined = null;

    if (opts.pingMode !== null && currentSoundMode === null) {
      newSoundMode = opts.pingMode;
    } else if (
      opts.pingMode === NotificationMode.MENTIONS_ONLY &&
      currentSoundMode === NotificationMode.ALL
    ) {
      newSoundMode = NotificationMode.MENTIONS_ONLY;
    } else if (opts.pingMode === NotificationMode.MUTE) {
      newSoundMode = NotificationMode.MUTE;
    }

    return postNotificationSettings({
      notificationPingMode: opts.pingMode,
      ...(newSoundMode !== null
        ? { notificationSoundMode: newSoundMode }
        : undefined),
      serverId: opts.serverId,
      channelId: opts.channelId,
    });
  };

  const setCurrentUser = (user: CurrentUser) => {
    currentUser = user;
  };

  const setAuthError = (
    newError: {
      message: string;
    } | null,
  ) => {
    authError = newError;
  };

  const setAuthenticated = (newAuthenticated: boolean) => {
    if (authenticated === newAuthenticated) return;
    authenticated = newAuthenticated;
    storeEmitter.emit("ws:authStateUpdate", authenticated);
  };
  const setConnected = (newConnected: boolean) => {
    connected = newConnected;
    storeEmitter.emit("ws:connectStateUpdate", connected);
  };

  const connectionState = () => {
    if (authError) {
      const message = authError.message;
      if (message) {
        if (message === "Invalid token.") {
          return t`Invalid token.`;
        }
        return message;
      }
      return t`Authentication error.`;
    }

    if (connected && !authenticated) {
      return t`Authenticating...`;
    }
    if (!connected) {
      return t`Connecting...`;
    }
    return t`Connected!`;
  };

  const hasNotifications = () => {
    let mentionCount = 0;
    messageMentionStore.mentions.forEach((m) => {
      mentionCount += m.count;
    });
    if (mentionCount) return mentionCount;

    friendStore.friends.forEach((f) => {
      if (f.status === FriendStatus.PENDING) mentionCount++;
    });
    if (mentionCount) return mentionCount;

    const hasNotification = Object.keys(
      serverStore.notificationsMemo.value(),
    ).length;

    if (hasNotification) return true;
    return false;
  };

  const setSessionId = (id: string) => {
    sessionId = id;
  };

  const updateServerOrder = (serverIds: string[]) => {
    if (currentUser) {
      currentUser.orderedServerIds = serverIds;
      storeEmitter.emit("server:order_update");
    }
  };

  const updateServerFolder = (folder: RawServerFolder) => {
    if (currentUser) {
      if (!folder.serverIds.length) {
        currentUser.serverFolders = currentUser.serverFolders.filter(
          (f) => f.id !== folder.id,
        );
      } else {
        currentUser.serverFolders = currentUser.serverFolders.map((f) => {
          if (f.id != folder.id) return f;
          return folder;
        });
      }
      storeEmitter.emit("server:order_update");
    }
  };
  const insertServerFolder = (folder: RawServerFolder) => {
    if (currentUser) {
      currentUser.serverFolders = [...currentUser.serverFolders, folder];
      storeEmitter.emit("server:order_update");
    }
  };

  return {
    get sessionId() {
      return sessionId;
    },
    get authenticated() {
      return authenticated;
    },
    setAuthenticated,
    get currentUser() {
      return currentUser;
    },
    get notificationSettings() {
      return notificationSettings;
    },
    get connected() {
      return connected;
    },
    get authError() {
      return authError;
    },
    insertServerFolder,
    updateServerFolder,
    updateServerOrder,
    setSessionId,
    setAuthError,
    setConnected,
    setCurrentUser,
    setNotificationSettings,
    getCombinedNotification,
    connectionState,
    updateNotificationSetting,
    hasNotifications,
    updateUserNotificationSettings,
  };
}
