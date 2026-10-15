import {
  getDiscoverPosts,
  getFeedPosts,
  getPostReplies,
  type DiscoverSort,
} from "../../services/PostService";
import type { RawPost } from "../../Types";
import { storeEmitter } from "../../utils/EventEmitter";
import { createPostHandler, PostItem } from "./PostItem";

import style from "./PostsArea.module.css";

type PostsAreaProps = {
  hideNewDayMarker?: boolean;
  signal: AbortSignal;
} & (
  | {
      type: "replies";
      postId: string;
    }
  | {
      type: "feed";
    }
  | {
      type: "discover";
      sort: DiscoverSort;
    }
  | {
      type: "post_replies";
      postId: string;
    }
  | {
      type: "user_posts" | "user_posts_and_replies" | "user_liked_posts";
      userId: string;
    }
);

export const PostsArea = (props: PostsAreaProps) => {
  let posts: RawPost[] | null = null;

  let postsEl = (<div class={style.posts}></div>) as HTMLDivElement;

  createPostHandler({
    signal: props.signal,
    container: postsEl,
  });

  let containerEl = (
    <div class={style.container}>{postsEl}</div>
  ) as HTMLDivElement;

  const fetchAndRender = async () => {
    if (props.type === "replies") {
      const [newPosts] = await getPostReplies(props.postId);
      posts = newPosts?.reverse() || null;
    }
    if (props.type === "discover") {
      const [newPosts] = await getDiscoverPosts({ sort: props.sort });
      posts = newPosts?.reverse() || null;
    }

    if (props.type === "feed") {
      const [newPosts] = await getFeedPosts();
      posts = newPosts;
    }
    rerender();
  };

  storeEmitter.on(
    "ws:authStateUpdate",
    (e) => {
      if (e) {
        rerender();
      }
    },
    props.signal,
  );

  const rerender = () => {
    postsEl.replaceChildren(
      <>
        {(posts || []).map((post, index) => (
          <PostItem
            hideNewDayMarker={
              props.hideNewDayMarker ||
              (props.type === "discover" && props.sort !== "")
            }
            post={post}
            container={postsEl}
            prevPost={posts?.[index - 1]}
            nextPost={posts?.[index + 1]}
          />
        ))}
      </>,
    );
  };

  fetchAndRender();

  props.signal.addEventListener(
    "abort",
    () => {
      postsEl.remove();
      containerEl.remove();
      (postsEl as any) = null;
      (containerEl as any) = null;
    },
    { once: true },
  );

  return containerEl;
};
