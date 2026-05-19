export const createIntersectionObserver = (
  target: HTMLDivElement,
  root: HTMLDivElement,
  onIntersect: () => void,
  signal: AbortSignal,
) => {
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) {
        onIntersect();
      }
    },
    { root },
  );

  observer.observe(target);

  signal.addEventListener(
    "abort",
    () => {
      observer.disconnect();
    },
    { once: true },
  );
};
