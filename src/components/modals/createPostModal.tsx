import { t } from "@lingui/core/macro";

import { getPostLikes, getPostReposts } from "../../services/PostService";
import type { RawPost } from "../../Types";
import { friendlyTimestamp } from "../../utils/date";
import { router } from "../../utils/router";
import {
  cacheOrFetchPost,
  createPostHandler,
  PostItem,
} from "../posts/PostItem";
import { PostsArea } from "../posts/PostsArea";
import { Avatar } from "../ui/avatar";
import { Item } from "../ui/item";
import { Link } from "../ui/link";
import { createModal, Modal } from "../ui/modal";
import { Skeleton } from "../ui/skeleton";

import style from "./createPostModal.module.css";

let ac = new AbortController();

type Tab = "" | "replies" | "likes" | "reposts";

export const createPostModal = (props: { postId: string }) => {
  ac.abort();
  ac = new AbortController();
  const { signal } = ac;

  let currentTab: Tab = "";

  let currentTabEl = (<div></div>) as HTMLDivElement;

  ac.signal.addEventListener(
    "abort",
    () => {
      tabAc.abort();
      if (new URLSearchParams(location.search).get("postId") === props.postId) {
        router.setQuery("postId", null);
      }
    },
    { once: true },
  );

  const previousPostsEl = (
    <div class={style.previousPosts}></div>
  ) as HTMLDivElement;

  const tabsEl = (<div class={style.tabs}></div>) as HTMLDivElement;

  let tabAc = new AbortController();

  const updateTab = (tab: Tab) => {
    if (tab === currentTab) return;

    currentTab = tab;

    tabAc.abort();
    tabAc = new AbortController();
    const { signal } = tabAc;

    if (currentTab === "replies") {
      currentTabEl.replaceChildren(
        <RepliesTab signal={signal} postId={props.postId} />,
      );
    }
    if (currentTab === "likes") {
      currentTabEl.replaceChildren(
        <LikesTab signal={signal} postId={props.postId} />,
      );
    }
    if (currentTab === "reposts") {
      currentTabEl.replaceChildren(
        <RepostsTab signal={signal} postId={props.postId} />,
      );
    }
  };

  const tabsHandler = Item.handler<Tab>({
    signal,
    container: tabsEl,
    initialTab: "replies",
    onChange: updateTab,
  });

  const rerenderTabs = (post?: RawPost | null) => {
    const replyCount = post?._count.comments.toLocaleString() || 0;
    const likeCount = post?._count.likedBy.toLocaleString() || 0;
    const repostCount = post?._count.reposts.toLocaleString() || 0;

    tabsEl.replaceChildren(
      <>
        <Item.Base handlePosition="bottom" data-value="replies">
          <Item.Icon name="reply" />
          <Item.Label>{t`Replies ~ ${replyCount}`}</Item.Label>
        </Item.Base>
        <Item.Base handlePosition="bottom" data-value="likes">
          <Item.Icon name="favorite" />
          <Item.Label>{t`Likes ~ ${likeCount}`}</Item.Label>
        </Item.Base>
        <Item.Base handlePosition="bottom" data-value="reposts">
          <Item.Icon name="repeat" />
          <Item.Label>{t`Reposts ~ ${repostCount}`}</Item.Label>
        </Item.Base>
      </>,
    );
    tabsHandler.update();
  };
  rerenderTabs();

  const body = (
    <Modal.Body width="700px" class={style.body}>
      {previousPostsEl}
      {tabsEl}
      {currentTabEl}
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

function RepliesTab(props: { signal: AbortSignal; postId: string }) {
  return (
    <PostsArea
      hideNewDayMarker
      type="replies"
      postId={props.postId}
      signal={props.signal}
    />
  );
}
function LikesTab(props: { signal: AbortSignal; postId: string }) {
  const el = (
    <div class={style.postActivityList}>
      <PostActivitySkeletons />
    </div>
  ) as HTMLDivElement;

  const fetchAndDisplayLikes = async () => {
    const [likes, err] = await getPostLikes(props.postId);
    if (props.signal.aborted) return;
    if (err) {
      el.replaceChildren();
      return;
    }

    el.replaceChildren(
      <>
        {likes.map((like) => (
          <Link
            class={style.postActivityUser}
            data-user={like.likedBy.id}
            href={`/app/profile/${like.likedBy.id}`}
          >
            <Avatar size={26} user={like.likedBy} />

            {like.likedBy.username}

            <span class={style.postActivityTimestamp}>
              {friendlyTimestamp(like.createdAt)}
            </span>
          </Link>
        ))}
      </>,
    );
  };

  fetchAndDisplayLikes();

  return el;
}
function RepostsTab(props: { signal: AbortSignal; postId: string }) {
  const el = (
    <div class={style.postActivityList}>
      <PostActivitySkeletons />
    </div>
  ) as HTMLDivElement;

  const fetchAndDisplayLikes = async () => {
    const [likes, err] = await getPostReposts(props.postId);
    if (props.signal.aborted) return;
    if (err) {
      el.replaceChildren();
      return;
    }

    el.replaceChildren(
      <>
        {likes.map((like) => (
          <Link
            class={style.postActivityUser}
            data-user={like.createdBy.id}
            href={`/app/profile/${like.createdBy.id}`}
          >
            <Avatar size={26} user={like.createdBy} />

            {like.createdBy.username}

            <span class={style.postActivityTimestamp}>
              {friendlyTimestamp(like.createdAt)}
            </span>
          </Link>
        ))}
      </>,
    );
  };

  fetchAndDisplayLikes();

  return el;
}

function PostActivitySkeletons() {
  return (
    <div class={style.postActivitySkeletons} aria-hidden="true">
      {Array.from({ length: 20 }, () => (
        <div class={style.postActivitySkeleton}>
          <Skeleton class={style.postActivityAvatarSkeleton} />
          <Skeleton class={style.postActivityUsernameSkeleton} />
          <Skeleton class={style.postActivityTimestampSkeleton} />
        </div>
      ))}
    </div>
  );
}
