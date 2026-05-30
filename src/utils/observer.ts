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

export const createResizeObserver = (
  target: HTMLElement,
  onResize: (event: { height: number; width: number }) => void,
  opts: { signal: AbortSignal; defer?: boolean },
) => {
  const observer = new ResizeObserver((entries) => {
    const box = entries[0]?.contentBoxSize[0];
    const rect = entries[0]?.contentRect;
    onResize({
      width: box?.inlineSize ?? rect?.width ?? 0,
      height: box?.blockSize ?? rect?.height ?? 0,
    });
  });

  observer.observe(target);

  if (opts.signal.aborted) {
    observer.disconnect();
    return;
  }

  if (!opts.defer) {
    onResize({
      height: target.clientHeight,
      width: target.clientWidth,
    });
  }

  opts.signal.addEventListener(
    "abort",
    () => {
      observer.disconnect();
    },
    { once: true },
  );
};
