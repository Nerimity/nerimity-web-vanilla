export const throttle = <T extends (...args: never[]) => void>(
  fn: T,
  delay: number,
) => {
  let last = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn(...args);
    }
  };
};
