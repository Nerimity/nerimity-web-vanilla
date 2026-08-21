export function createUpdatedHandler<T extends string, V>(
  initialValue: () => Record<T, V>,
  signal: AbortSignal,
) {
  const changedValues: Partial<Record<T, V>> = {};

  let onUpdateHandler:
    | undefined
    | ((
        changedValues: Partial<Record<T, V>>,
        hasChangedValues: boolean,
      ) => void) = undefined;

  const onUpdate = (cb: typeof onUpdateHandler) => {
    onUpdateHandler = cb;
  };

  const check = () => {
    const updatedValues: Partial<Record<T, V>> = {};
    const entries = Object.entries(initialValue()) as [T, V][];
    for (const [key, val] of entries) {
      const changedVal = changedValues[key];
      if (changedVal === undefined) continue;
      if (changedVal !== val) {
        updatedValues[key] = changedVal;
      }
    }
    onUpdateHandler?.(updatedValues, !!Object.keys(updatedValues).length);
  };

  const handleInput = (inputContainer: HTMLDivElement, key: T) => {
    inputContainer.querySelector("input")?.addEventListener(
      "input",
      (e) => {
        const t = e.target as HTMLInputElement;
        update(key, t.value as V);
      },
      { signal },
    );
  };

  const update = (key: T, value: V) => {
    changedValues[key] = value;
    check();
  };

  return { handleInput, onUpdate };
}
