export const debounce = <T extends (...args: never[]) => void>(
  fn: T,
  delay: number,
) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};
