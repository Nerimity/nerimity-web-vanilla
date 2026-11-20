import ZstdWorker from "./zstd.worker?worker";

const resolvers: Array<[(value: any) => void, (error: Error) => void]> = [];

const worker = new ZstdWorker();

worker.onmessage = ({ data }) => {
  const entry = resolvers.shift();
  if (!entry) return;
  const [resolve, reject] = entry;
  if (data.error) {
    reject(new Error(data.error));
  } else {
    resolve(data.result);
  }
};

worker.onerror = (e) => {
  for (const [, reject] of resolvers.splice(0)) {
    reject(new Error(e.message));
  }
};

export const decompressInWorker = (buf: ArrayBuffer) =>
  new Promise<any>((resolve, reject) => {
    resolvers.push([resolve, reject]);
    worker.postMessage(buf, [buf]);
  });
