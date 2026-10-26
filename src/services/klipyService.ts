import { request } from "./request";

export interface KlipyResult {
  next: string;
  results: KlipyItem[];
}
export interface KlipyItem {
  gifUrl: string;
  url: string;
  previewUrl: string;
  previewHeight: number;
  previewWidth: number;
}

export const klipyTrending = async (pos?: string) => {
  return request<KlipyResult>(`/v2/tenor/trending`, {
    useToken: true,
    method: "GET",
    params: {
      pos,
    },
  });
};
export const klipySearch = async (query: string, pos?: string) => {
  return request<KlipyResult>(`/v2/tenor/search`, {
    useToken: true,
    method: "GET",
    params: {
      query,
      pos,
    },
  });
};
