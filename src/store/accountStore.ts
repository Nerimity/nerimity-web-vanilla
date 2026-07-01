import { t } from "@lingui/core/macro";

import type { RawServerFolder, RawUserNotificationSettings } from "../Types";
import { storeEmitter } from "../utils/EventEmitter";
import { channelStore } from "./channelStore";
import { serverStore } from "./serverStore";
import { User } from "./userStore";

export const accountStore = createAccountStore();

type CurrentUser = User & {
  orderedServerIds: string[];
  serverFolders: RawServerFolder[];
};

function createAccountStore() {
  let connected = false;
  let authenticated = false;
  let authError: {
    message: string;
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

  return {
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
    setAuthError,
    setConnected,
    setCurrentUser,
    setNotificationSettings,
    getCombinedNotification,
    connectionState,
    updateNotificationSetting,
  };
}
