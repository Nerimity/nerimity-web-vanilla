import type { RawPost } from "../Types";
import { request } from "./request";

interface GetFeedPostsOpts {
  /**
   * @default 30
   */
  limit?: number;
  beforeId?: string;
  afterId?: string;
}

export const getFeedPosts = async (opts?: GetFeedPostsOpts) => {
  return request<RawPost[]>(`/posts/feed`, {
    useToken: true,
    method: "GET",
    params: {
      ...(opts?.limit ? { limit: opts.limit } : undefined),
      ...(opts?.beforeId ? { beforeId: opts.beforeId } : undefined),
      ...(opts?.afterId ? { afterId: opts.afterId } : undefined),
    },
  });
};
