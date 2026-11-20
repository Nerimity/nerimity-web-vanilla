import { decompressObject } from "./zstd";

self.onmessage = (e: MessageEvent<ArrayBuffer>) => {
  try {
    const object = decompressObject(new Uint8Array(e.data)) as any;

    self.postMessage({ result: object });
  } catch (error) {
    self.postMessage({ error: String(error) });
  }
};
