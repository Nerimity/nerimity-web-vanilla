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

export type DiscoverSort =
  | ""
  | "mostLiked7Days"
  | "mostLiked30days"
  | "mostLikedAllTime";
interface GetDiscoverPostsOpts {
  limit?: number;
  beforeId?: string;
  afterId?: string;

  sort?: DiscoverSort;
}

export const getDiscoverPosts = async (opts?: GetDiscoverPostsOpts) => {
  return request<RawPost[]>(`/posts/discover`, {
    useToken: true,
    method: "GET",
    params: {
      ...(opts?.sort ? { sort: opts.sort } : undefined),
      ...(opts?.limit ? { limit: opts.limit } : undefined),
      ...(opts?.beforeId ? { beforeId: opts.beforeId } : undefined),
      ...(opts?.afterId ? { afterId: opts.afterId } : undefined),
    },
  });
};

export const likePost = async (postId: string) => {
  return request<RawPost>(`/posts/${postId}/like`, {
    useToken: true,
    method: "POST",
  });
};

export const unlikePost = async (postId: string) => {
  return request<RawPost>(`/posts/${postId}/unlike`, {
    useToken: true,
    method: "POST",
  });
};
export const repostPost = async (postId: string) => {
  return request<RawPost>(`/posts/${postId}/repost`, {
    useToken: true,
    method: "POST",
  });
};

export const deletePost = async (postId: string) => {
  return request(`/posts/${postId}`, {
    useToken: true,
    method: "DELETE",
  });
};
