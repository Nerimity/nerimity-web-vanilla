import type { RawExploreItem } from "../Types";
import { request } from "./request";

export type PublicServerSort =
  | "pinned_at"
  | "most_bumps"
  | "most_members"
  | "recently_added"
  | "recently_bumped"
  | "most_active";
export type PublicServerFilter = "pinned" | "all" | "verified";

interface getExploreItemsOpts {
  sort: PublicServerSort;
  filter: PublicServerFilter;
  limit?: number;
  afterId?: string;
  search?: string;
  type?: "bot" | "server";
}

export const getExploreItems = async (opts: getExploreItemsOpts) => {
  return request<RawExploreItem[]>(`/explore`, {
    useToken: true,
    method: "GET",
    params: opts,
  });
};
