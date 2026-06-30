import { apiUrl } from "../config";
import { safeParseJson } from "../utils/json";
import { getLocalItem } from "../utils/localStorage";

interface RequestOpts {
  useToken?: boolean | string;
  body?: any;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  params?: Record<string, string | undefined>;
  text?: boolean;
}

export interface Error {
  message: string;
}
export async function request<T>(rawUrl: string, opts?: RequestOpts) {
  const url = new URL(`${apiUrl}${rawUrl}`);
  if (opts?.params) {
    Object.entries(opts.params).forEach(([key, value]) => {
      if (value === undefined) return;
      url.searchParams.set(key, value);
    });
  }

  const token = getLocalItem("userToken") || "";
  const res = await fetch(url, {
    method: opts?.method,
    ...(opts?.body && { body: JSON.stringify(opts.body) }),
    headers: {
      "Content-Type": "application/json",
      ...(opts?.useToken && {
        Authorization:
          typeof opts.useToken === "string" ? opts.useToken : token,
      }),
    },
  }).catch(() => {
    return;
  });
  if (!res) return [null, { message: "Network error" } as Error] as const;
  if (!res.ok) {
    const raw = await res.text();
    const error = safeParseJson(raw);
    console.error(raw);
    if (!error) return [null, { message: raw } as Error] as const;
    return [null, error as Error] as const;
  }
  if (opts?.text) {
    return [res.text() as T, null] as const;
  }

  const json = await res.json();
  return [json as T, null] as const;
}

export async function xhrRequest<T>(
  rawUrl: string,
  opts?: RequestOpts & {
    onProgress?: (percent: number, speed?: string) => void;
    file?: File;
  },
) {
  const url = new URL(rawUrl);
  if (opts?.params) {
    Object.entries(opts.params).forEach(([key, value]) => {
      if (value === undefined) return;
      url.searchParams.set(key, value);
    });
  }

  const xhr = new XMLHttpRequest();
  xhr.open(opts?.method || "GET", url, true);

  if (opts?.useToken) {
    const token = getLocalItem("userToken") || "";
    xhr.setRequestHeader(
      "Authorization",
      typeof opts.useToken == "string" ? opts.useToken : token,
    );
  }
  const progressHandler = createProgressHandler(opts?.onProgress);

  xhr.upload.onprogress = (e) => {
    progressHandler(e);
  };

  if (opts?.file) {
    xhr.setRequestHeader("Content-Type", opts.file.type);
    xhr.setRequestHeader("File-Name", encodeURIComponent(opts.file.name));
  }
  xhr.send(opts?.file);

  return new Promise<[T | null, Error | null]>((res) => {
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== XMLHttpRequest.DONE) return;
      if (xhr.status === 0) {
        return res([null, { message: "Network error" } as Error] as const);
      }
      const text = xhr.responseText;

      if (xhr.status !== 200) {
        const error = safeParseJson(text);
        if (!error) return res([null, { message: text } as Error] as const);
        return res([null, error as Error] as const);
      }
      if (opts?.text) {
        return res([text as T, null] as const);
      }

      const json = safeParseJson(text);
      if (!json) return res([null, { message: text } as Error] as const);
      return res([json as T, null] as const);
    };
  });
}

const createProgressHandler = (
  onProgress?: (percent: number, speed?: string) => void,
) => {
  let startTime = 0;
  let uploadedSize = 0;
  return (e: ProgressEvent) => {
    if (!startTime) {
      startTime = Date.now();
    }
    uploadedSize = e.loaded;

    const elapsedTime = Date.now() - startTime;
    const uploadSpeed = uploadedSize / (elapsedTime / 1000);
    const uploadSpeedKBps = uploadSpeed / 1024;
    const uploadSpeedMBps = uploadSpeedKBps / 1024;

    let unit = " KB/s";
    if (uploadSpeedMBps >= 1) {
      unit = " MB/s";
    }
    let speed: string | undefined =
      uploadSpeedMBps >= 1
        ? uploadSpeedMBps.toFixed(2) + unit
        : uploadSpeedKBps.toFixed(0) + unit;

    if (uploadSpeedMBps == Infinity) {
      speed = "0 KB/s";
    }

    if (e.lengthComputable) {
      const percentComplete = (e.loaded / e.total) * 100;
      onProgress?.(Math.round(percentComplete), speed);
    }
  };
};
