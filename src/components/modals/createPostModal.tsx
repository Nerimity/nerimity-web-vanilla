import { t } from "@lingui/core/macro";

import type { RawPost } from "../../Types";
import { router } from "../../utils/router";
import {
  cacheOrFetchPost,
  createPostHandler,
  PostItem,
} from "../posts/PostItem";
import { PostsArea } from "../posts/PostsArea";
import { Item } from "../ui/item";
import { createModal, Modal } from "../ui/modal";

import style from "./createPostModal.module.css";

let ac = new AbortController();

export const createPostModal = (props: { postId: string }) => {
  ac.abort();
  ac = new AbortController();
  const { signal } = ac;

  ac.signal.addEventListener(
    "abort",
    () => {
      if (new URLSearchParams(location.search).get("postId") === props.postId) {
        router.setQuery("postId", null);
      }
    },
    { once: true },
  );

  const previousPostsEl = (
    <div class={style.previousPosts}></div>
  ) as HTMLDivElement;

  const TabsEl = (<div class={style.tabs}></div>) as HTMLDivElement;

  const rerenderTabs = (post?: RawPost | null) => {
    const replyCount = post?._count.comments.toLocaleString() || 0;
    const likeCount = post?._count.likedBy.toLocaleString() || 0;
    const repostCount = post?._count.reposts.toLocaleString() || 0;

    TabsEl.replaceChildren(
      <>
        <Item.Base handlePosition="bottom" selected>
          <Item.Icon name="reply" />
          <Item.Label>{t`Replies ~ ${replyCount}`}</Item.Label>
        </Item.Base>
        <Item.Base handlePosition="bottom">
          <Item.Icon name="favorite" />
          <Item.Label>{t`Likes ~ ${likeCount}`}</Item.Label>
        </Item.Base>
        <Item.Base handlePosition="bottom">
          <Item.Icon name="repeat" />
          <Item.Label>{t`Reposts ~ ${repostCount}`}</Item.Label>
        </Item.Base>
      </>,
    );
  };
  rerenderTabs();

  const body = (
    <Modal.Body width="700px" class={style.body}>
      {previousPostsEl}
      {TabsEl}
      <PostsArea
        hideNewDayMarker
        type="replies"
        postId={props.postId}
        signal={signal}
      />
    </Modal.Body>
  ) as HTMLDivElement;

  createPostHandler({
    container: previousPostsEl,
    signal: signal,
  });

  const fetchAndDisplayPost = async (postId: string, isRoot = false) => {
    const post = await cacheOrFetchPost(postId);
    if (signal.aborted) return;

    if (isRoot) {
      rerenderTabs(post);
    }

    previousPostsEl.prepend(
      <PostItem
        disableHover={isRoot}
        forceBottomBorder
        hideNewDayMarker
        showFullDate
        container={previousPostsEl}
        post={post}
      />,
    );
    if (post?.commentToId) {
      fetchAndDisplayPost(post.commentToId);
    }
  };

  fetchAndDisplayPost(props.postId, true);

  createModal(() => <Modal.Root>{body}</Modal.Root>, ac);
};

export const destroyPostModal = () => {
  ac.abort();
};
