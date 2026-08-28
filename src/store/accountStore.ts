import { t } from "@lingui/core/macro";

import {
  FriendStatus,
  type RawNotice,
  type RawServerFolder,
  type RawUserNotificationSettings,
} from "../Types";
import { storeEmitter } from "../utils/EventEmitter";
import { channelStore } from "./channelStore";
import { friendStore } from "./friendStore";
import { messageMentionStore } from "./messageMentionStore";
import { serverStore } from "./serverStore";
import { User } from "./userStore";

export const accountStore = createAccountStore();

export type CurrentUser = User & {
  orderedServerIds: string[];
  serverFolders: RawServerFolder[];
  notices: RawNotice[];
  email?: string;
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
  let notificationSettings = new Map<string, RawUserNotificationSettings>();

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
    setSessionId,
    setAuthError,
    setConnected,
    setCurrentUser,
    setNotificationSettings,
    getCombinedNotification,
    connectionState,
    updateNotificationSetting,
    hasNotifications,
  };
}
