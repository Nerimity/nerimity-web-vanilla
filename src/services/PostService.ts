import { accountStore } from "../store/accountStore";
import type { RawPost, RawPostNotification, RawUser } from "../Types";
import { storeEmitter } from "../utils/EventEmitter";
import { nerimityCDNUploadRequest } from "./cdnService";
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
  /**
   * @default 30
   */
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

export const getPost = async (postId: string) => {
  return request<RawPost>(`/posts/${postId}`, {
    useToken: true,
    method: "GET",
  });
};

interface LikedPost {
  likedBy: RawUser;
  createdAt: number;
}

export const getPostLikes = async (postId: string) => {
  return request<LikedPost[]>(`/posts/${postId}/likes`, {
    useToken: true,
    method: "GET",
  });
};

interface RepostedPost {
  createdBy: RawUser;
  createdAt: number;
}
export const getPostReposts = async (postId: string) => {
  return request<RepostedPost[]>(`/posts/${postId}/reposts`, {
    useToken: true,
    method: "GET",
  });
};

export const getUserPosts = async (opts: {
  userId?: string;
  withReplies?: boolean;
  /**
   * @default 30
   */
  limit?: number;
  beforeId?: string;
  afterId?: string;
}) => {
  const defaultOpts = {
    ...opts,
    withReplies: opts.withReplies ?? true,
  };
  return request<RawPost[]>(`/users/${opts.userId}/posts`, {
    useToken: true,
    method: "GET",
    params: {
      ...(defaultOpts.withReplies
        ? { withReplies: defaultOpts.withReplies }
        : undefined),
      ...(defaultOpts.limit ? { limit: defaultOpts.limit } : undefined),
      ...(defaultOpts.beforeId
        ? { beforeId: defaultOpts.beforeId }
        : undefined),
      ...(defaultOpts.afterId ? { afterId: defaultOpts.afterId } : undefined),
    },
  });
};
export const getUserLikedPosts = async (opts: { userId?: string }) => {
  return request<RawPost[]>(`/users/${opts.userId}/posts/liked`, {
    useToken: true,
    method: "GET",
  });
};
export const getPostNotificationCount = async () => {
  return request<number>(`/posts/notifications/count`, {
    useToken: true,
    method: "GET",
  });
};
export const dismissPostNotifications = async () => {
  return request(`/posts/notifications/dismiss`, {
    useToken: true,
    method: "POST",
    text: true,
  });
};
export const votePostPoll = async (opts: {
  postId: string;
  pollId: string;
  choiceId: string;
}) => {
  return request(
    `/posts/${opts.postId}/polls/${opts.pollId}/choices/${opts.choiceId}`,
    {
      useToken: true,
      method: "POST",
    },
  );
};

export const getPostNotifications = async () => {
  return request<RawPostNotification[]>(`/posts/notifications`, {
    useToken: true,
    method: "GET",
  });
};

export const getPostReplies = async (
  postId: string,
  opts?: {
    /**
     * @default 30
     */
    limit?: number;
    beforeId?: string;
    afterId?: string;
  },
) => {
  return request<RawPost[]>(`/posts/${postId}/comments`, {
    useToken: true,
    method: "GET",
    params: {
      ...(opts?.limit ? { limit: opts.limit } : undefined),
      ...(opts?.beforeId ? { beforeId: opts.beforeId } : undefined),
      ...(opts?.afterId ? { afterId: opts.afterId } : undefined),
    },
  });
};

export const createPost = async (opts: {
  id: string;
  content?: string;
  attachment?: File;
  replyToPostId?: string;
  poll?: { choices: string[] };
}) => {
  const userId = accountStore.currentUser!.id;

  let fileId: string | undefined;
  if (opts.attachment) {
    const onUploadProgress = (progress: number, speed?: string) => {
      storeEmitter.emit("attachment:upload_progress", {
        postId: opts.id,
        progress,
        speed,
      });
    };

    const [res, err] = await nerimityCDNUploadRequest({
      file: opts.attachment,
      type: "attachments",
      groupId: userId,
      onUploadProgress,
    });
    console.log(res, err);

    if (err) {
      return [null, err] as const;
    }

    fileId = res!.fileId;
  }

  const body = {
    content: opts.content,
    poll: opts.poll,
    ...(fileId ? { nerimityCdnFileId: fileId } : undefined),
    ...(opts.replyToPostId ? { postId: opts.replyToPostId } : undefined),
  };

  return request<RawPost>(`/posts`, {
    useToken: true,
    method: "POST",
    body,
  });
};
