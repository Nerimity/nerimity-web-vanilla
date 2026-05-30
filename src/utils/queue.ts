// https://github.com/henrygd/queue
// removed unused features.

/** List node */
type Node<T> = {
  /** input promise wrapper */
  p: () => T;
  /** resolve returned promise */
  res: (value: T) => void;
  /** reject returned promise */
  rej: (reason: any) => void;
  /** next node pointer */
  next?: Node<T>;
};

/** Queue interface */
export interface Queue {
  /** Add an async function / promise wrapper to the queue */
  add<T>(promiseFunction: () => PromiseLike<T>): Promise<T>;
  /** Empties the queue (active promises are not cancelled) */
  clear(): void;
}

export let newQueue = (): Queue => {
  let active = 0;
  let size = 0;
  let head: Node<PromiseLike<any>> | undefined | null;
  let tail: Node<PromiseLike<any>> | undefined | null;

  let afterRun = () => {
    active--;
    if (--size) {
      run();
    }
  };

  let run = () => {
    if (head && active < 1) {
      active++;
      let curHead = head;
      head = head.next;
      curHead.p().then(
        (v) => (curHead.res(v), afterRun()),
        (e) => (curHead.rej(e), afterRun()),
      );
    }
  };

  return {
    add<T>(p: () => PromiseLike<T>) {
      let node = { p } as Node<PromiseLike<T>>;
      let promise = new Promise((res, rej) => {
        node.res = res;
        node.rej = rej;
      });
      if (head) {
        tail = tail!.next = node;
      } else {
        tail = head = node;
      }
      size++;
      run();
      return promise as Promise<T>;
    },

    clear() {
      for (let node = head; node; node = node.next) {
        node.rej(new Error("Queue cleared"));
      }
      head = tail = null;
      size = active;
    },
  };
};
