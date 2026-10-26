import type { KlipyItem } from "../services/klipyService";
import type { DiscoverSort } from "../services/PostService";
import type { Sound, SoundType } from "./sounds";

export interface RecentEmoji {
  type: "default" | "custom";
  id: string;
}
interface LocalStorageData {
  userToken: string;
  messageReplyShouldMention: boolean;
  recentServerChannels: [string, string][];
  cdnToken: {
    token: string;
    channelId?: string;
    createdAt: number;
  }[];
  recentEmojis: RecentEmoji[];
  favoriteGifs: KlipyItem[];
  desktopNotification: boolean;
  soundNotification: boolean;
  soundNotificationVolume: number;
  soundNotificationTypes: Partial<Record<SoundType, Sound>>;
  discoverSort: DiscoverSort;
  rightDrawerWidth: number;
  leftDrawerWidth: number;
  sidebarWidth: number;
}

export type LocalStorageKeys = keyof LocalStorageData;

const defaultValues: Partial<LocalStorageData> = {
  soundNotification: true,
  soundNotificationVolume: 10,
  soundNotificationTypes: {
    MESSAGE: "default",
    MESSAGE_MENTION: "default",
    REMINDER: "level-up",
    CALL_JOIN: "default-call-join",
    CALL_LEAVE: "default-call-leave",
  },
};

export const getLocalItem = <T extends keyof LocalStorageData>(
  key: T,
  defaultValue?: LocalStorageData[T],
): LocalStorageData[T] | null => {
  const value = localStorage.getItem(key);
  if (value === null) {
    return (defaultValue ?? defaultValues[key] ?? null) as
      | LocalStorageData[T]
      | null;
  }
  try {
    return JSON.parse(value) as LocalStorageData[T] | null;
  } catch {
    return value as LocalStorageData[T] | null;
  }
};

export const setLocalItem = <T extends keyof LocalStorageData>(
  key: T,
  value: LocalStorageData[T],
) =>
  localStorage.setItem(
    key,
    typeof value === "string" ? value : JSON.stringify(value),
  );

export const removeLocalItem = (key: keyof LocalStorageData) =>
  localStorage.removeItem(key);
