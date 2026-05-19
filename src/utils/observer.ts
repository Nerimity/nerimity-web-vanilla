export const createIntersectionObserver = (
  target: HTMLDivElement,
  root: HTMLDivElement,
  onIntersect: () => void,
  signal: AbortSignal,
) => {
  let intersecting = false;
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) {
        intersecting = true;
        onIntersect();
        return;
      }
      intersecting = false;
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
  return {
    get intersecting() {
      return intersecting;
    },
  };
};
