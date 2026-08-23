type ValueMap = Record<string, unknown>;

type KeysOfType<T extends ValueMap, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

type Handler<T extends ValueMap> = {
  type: "input";
  el: HTMLInputElement;
  key: keyof T;
};

export function createUpdatedHandler<T extends ValueMap>(
  initialValue: () => T,
  signal: AbortSignal,
) {
  let changedValues: Partial<T> = {};

  const handlers: Handler<T>[] = [];

  let onUpdateHandler:
    | undefined
    | ((changedValues: Partial<T>, hasChangedValues: boolean) => void) =
    undefined;

  const onUpdate = (cb: typeof onUpdateHandler) => {
    onUpdateHandler = cb;
  };

  const check = () => {
    const updatedValues: Partial<T> = {};
    const entries = Object.entries(initialValue()) as [keyof T, T[keyof T]][];
    for (const [key, val] of entries) {
      const changedVal = changedValues[key];
      if (changedVal === undefined) continue;
      if (JSON.stringify(changedVal) !== JSON.stringify(val)) {
        updatedValues[key] = changedVal;
      }
    }
    onUpdateHandler?.(updatedValues, !!Object.keys(updatedValues).length);
  };

  const update = <K extends keyof T>(key: K, value: T[K] | undefined) => {
    changedValues[key] = value;
    check();
  };

  const handleInput = <K extends KeysOfType<T, string>>(
    inputContainer: HTMLDivElement,
    key: K,
  ) => {
    const inputEl = inputContainer.querySelector("input")! as HTMLInputElement;
    handlers.push({ type: "input", el: inputEl, key });

    inputEl.addEventListener(
      "input",
      (e) => {
        const t = e.target as HTMLInputElement;
        update(key, t.value as T[K]);
      },
      { signal },
    );
  };

  const undo = () => {
    for (const handler of handlers) {
      if (changedValues[handler.key] === undefined) continue;
      if (handler.type === "input") {
        handler.el.value = initialValue()[handler.key] as string;
      }
    }
    changedValues = {};
    check();
  };

  return {
    get changedValues() {
      return changedValues;
    },
    handleInput,
    onUpdate,
    undo,
    changeValue: update,
  };
}
