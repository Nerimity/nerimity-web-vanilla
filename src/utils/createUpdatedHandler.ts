export function createUpdatedHandler<T extends string, V>(
  initialValue: () => Record<T, V>,
  signal: AbortSignal,
) {
  const changedValues: Partial<Record<T, V>> = {};

  const handlers: { type: "input"; el: HTMLInputElement; key: T }[] = [];

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
    const inputEl = inputContainer.querySelector("input")! as HTMLInputElement;
    handlers.push({ type: "input", el: inputEl, key });

    inputEl.addEventListener(
      "input",
      (e) => {
        const t = e.target as HTMLInputElement;
        update(key, t.value as V);
      },
      { signal },
    );
  };

  const undo = () => {
    for (let i = 0; i < handlers.length; i++) {
      const handler = handlers[i]!;
      if (changedValues[handler.key] === undefined) continue;
      if (handler.type === "input") {
        delete changedValues[handler.key];
        handler.el.value = initialValue()[handler.key] as string;
      }
    }
    check();
  };

  const update = (key: T, value: V) => {
    changedValues[key] = value;
    check();
  };

  return { handleInput, onUpdate, undo };
}
