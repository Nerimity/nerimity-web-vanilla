interface LocalStorageData {
  userToken: string;
}

export const getLocalItem = <T extends keyof LocalStorageData>(key: T) =>
  JSON.parse(localStorage.getItem(key) || "null") as LocalStorageData[T] | null;

export const setLocalItem = <T extends keyof LocalStorageData>(
  key: T,
  value: LocalStorageData[T],
) => localStorage.setItem(key, JSON.stringify(value));
