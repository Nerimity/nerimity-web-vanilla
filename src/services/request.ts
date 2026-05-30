import { apiUrl } from "../config";
import { safeParseJson } from "../utils/json";
import { getLocalItem } from "../utils/localStorage";

interface RequestOpts {
  useToken?: boolean;
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

  const res = await fetch(url, {
    method: opts?.method,
    ...(opts?.body && { body: JSON.stringify(opts.body) }),
    headers: {
      "Content-Type": "application/json",
      ...(opts?.useToken && {
        Authorization: getLocalItem("userToken") as string,
      }),
    },
  }).catch(() => {
    return;
  });
  if (!res) return [null, { message: "Network error" } as Error] as const;
  if (!res.ok) {
    const raw = await res.text();
    const error = safeParseJson(raw);
    if (!error) return [null, { message: raw } as Error] as const;
    return [null, error as Error] as const;
  }
  if (opts?.text) {
    return [res.text() as T, null] as const;
  }

  const json = await res.json();
  return [json as T, null] as const;
}
