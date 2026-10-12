import { getDiscoverPosts, getFeedPosts } from "../../services/PostService";
import type { RawPost } from "../../Types";
import { reconcile } from "../../utils/html";
import { handleImagePreviewModal } from "../ImagePreviewModal";
import { createImageEmbedResizer } from "../message-pane/imageEmbed";
import { PostItem } from "./PostItem";

import style from "./PostsArea.module.css";

type PostsAreaProps =
  | {
      signal: AbortSignal;
      type: "feed" | "discover";
    }
  | {
      signal: AbortSignal;
      type: "post_replies";
      postId: string;
    }
  | {
      signal: AbortSignal;
      type: "user_posts" | "user_posts_and_replies" | "user_liked_posts";
      userId: string;
    };

export const PostsArea = (props: PostsAreaProps) => {
  let posts: RawPost[] | null = null;

  let postsEl = (<div class={style.posts}></div>) as HTMLDivElement;

  let containerEl = (
    <div class={style.container}>{postsEl}</div>
  ) as HTMLDivElement;

  const fetchAndRender = async () => {
    if (props.type === "discover") {
      const [newPosts] = await getDiscoverPosts();
      posts = newPosts?.reverse() || null;
    }

    if (props.type === "feed") {
      const [newPosts] = await getFeedPosts();
      posts = newPosts;
    }
    rerender();
  };

  const imageEmbedResizer = createImageEmbedResizer(containerEl);

  handleImagePreviewModal({
    root: containerEl,
    signal: props.signal,
    selector: ".imageEmbed .image",
  });

  const rerender = () => {
    reconcile({
      container: postsEl,
      values: posts ?? [],
      valueId: "id",
      dataAttr: "data-id",
      create(item, index) {
        return (
          <PostItem
            post={item}
            container={postsEl}
            prevPost={posts?.[index - 1]}
            nextPost={posts?.[index + 1]}
          />
        );
      },
    });
  };

  fetchAndRender();

  props.signal.addEventListener(
    "abort",
    () => {
      postsEl.remove();
      containerEl.remove();
      (postsEl as any) = null;
      (containerEl as any) = null;
      imageEmbedResizer.destroy();
    },
    { once: true },
  );

  return containerEl;
};
