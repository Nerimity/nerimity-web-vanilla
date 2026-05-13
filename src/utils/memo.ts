export class ManualMemo<T> {
  private cache: { value: T } | null = null;
  private func: (prev?: any) => T;
  private listeners = new Set<(value: T) => void>();

  constructor(func: (prev: any) => T) {
    this.func = func;
  }

  value(prev?: any): T {
    if (this.cache) return this.cache.value;
    this.cache = { value: this.func(prev) };
    return this.cache.value;
  }

  rerun() {
    const prev = this.cache?.value;
    this.cache = null;
    const value = this.value(prev);
    this.listeners.forEach((l) => l(value));
  }

  onUpdate(listener: (value: T) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
