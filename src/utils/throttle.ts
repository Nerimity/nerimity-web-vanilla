type ThrottleOptions = {
  leading?: boolean;
  trailing?: boolean;
};

export const throttle = <T extends (...args: never[]) => void>(
  fn: T,
  delay: number,
  { leading = true, trailing = true }: ThrottleOptions = {},
) => {
  let last = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const invoke = (args: Parameters<T>) => {
    last = Date.now();
    fn(...args);
  };

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (last === 0 && !leading) last = now;

    const remaining = delay - (now - last);
    lastArgs = args;

    if (remaining <= 0) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      invoke(args);
    } else if (!timeout && trailing) {
      timeout = setTimeout(() => {
        timeout = null;
        if (lastArgs) invoke(lastArgs);
      }, remaining);
    }
  };
};
