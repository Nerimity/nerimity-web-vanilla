export const createIntersectionObserver = (
  target: HTMLDivElement,
  root: HTMLDivElement,
  onIntersect: () => void,
  opts: { rootMargin?: string; signal: AbortSignal },
) => {
  let intersecting = false;
  const observer = new IntersectionObserver(
    (entries) => {
      const isIntersecting = entries.find((e) => e.isIntersecting);
      if (isIntersecting) {
        intersecting = true;
        onIntersect();
        return;
      }
      intersecting = false;
    },
    { root, rootMargin: opts.rootMargin },
  );

  observer.observe(target);

  opts.signal.addEventListener(
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
