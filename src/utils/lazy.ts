export const lazy = <T extends (...args: any[]) => unknown>(
  importer: () => Promise<{ default: T }>,
) => {
  return async (...args: Parameters<T>) =>
    await importer().then((module) => module.default(...args) as ReturnType<T>);
};

export type LazyResult<T extends () => Promise<any>> = Awaited<ReturnType<T>>;
