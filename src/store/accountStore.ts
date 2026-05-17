import { t } from "@lingui/core/macro";
import type { RawUser, RawUserNotificationSettings } from "../Types";
import { storeEmitter } from "../utils/EventEmitter";
import { User } from "./userStore";

export const accountStore = createAccountStore();

function createAccountStore() {
  let connected = false;
  let authenticated = false;
  let currentUser: User | null = null;
  let notificationSettings = new Map<string, RawUserNotificationSettings>();

  const setNotificationSettings = (
    newSettings: RawUserNotificationSettings[],
  ) => {
    notificationSettings.clear();
    for (let i = 0; i < newSettings.length; i++) {
      const setting = newSettings[i]!;
      const serverOrChannelId = setting.serverId || setting.channelId!;
      notificationSettings.set(serverOrChannelId, setting);
    }
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

  const setCurrentUser = (user: RawUser) => {
    currentUser = new User(user);
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
    setConnected,
    setCurrentUser,
    setNotificationSettings,
    getCombinedNotification,
    connectionState,
  };
}
