export class ManualMemo<T> {
  private cache: { value: T } | null = null;
  private func: () => T;
  private listeners = new Set<(value: T) => void>();

  constructor(func: () => T) {
    this.func = func;
  }

  value(): T {
    if (this.cache) return this.cache.value;
    this.cache = { value: this.func() };
    return this.cache.value;
  }

  rerun() {
    this.cache = null;
    const value = this.value();
    this.listeners.forEach((l) => l(value));
  }

  onUpdate(listener: (value: T) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
