interface LocalStorageData {
  userToken: string;
}

export const getLocalItem = <T extends keyof LocalStorageData>(
  key: T,
): LocalStorageData[T] | null => {
  const value = localStorage.getItem(key);
  if (value === null) return null;
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
