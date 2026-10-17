import { t } from "@lingui/core/macro";
import { Trans } from "@trans";

import {
  createPost,
  getDiscoverPosts,
  getFeedPosts,
  getPostReplies,
  type DiscoverSort,
} from "../../services/PostService";
import { accountStore } from "../../store/accountStore";
import type { RawPost } from "../../Types";
import { getClosestElementFromEvent } from "../../utils/dom";
import { storeEmitter } from "../../utils/EventEmitter";
import { Button } from "../ui/button";
import {
  createTextareaHeightHandler,
  handleFormatBar,
  Input,
} from "../ui/input";
import { alert, createModal, Modal } from "../ui/modal";
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
      type: "feed"; // now called "following"
    }
  | {
      type: "discover"; // now called "Feed"
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

  const showInputArea = ["replies", "feed"].includes(props.type);

  const handlePostCreate = async (event: PostCreateEvent) => {
    const content = event.content.trim();
    if (!content) return;
    const newPost: RawPost = {
      content,

      id: Math.random().toString(),
      _count: { comments: 0, likedBy: 0, reposts: 0 },
      createdAt: Date.now(),
      createdBy: accountStore.currentUser!,
      deleted: false,
      block: false,
      likedBy: [],
      mentions: [],
      reposts: [],
      views: 0,
      local: {
        status: "failed",
      },
    };
    posts = [newPost, ...(posts || [])];
    rerender();

    const [createdPost, err] = await createPost({
      content,
      replyToPostId: props.type === "replies" ? props.postId : undefined,
    });
    if (props.signal.aborted) return;
    if (err) {
      alert({ message: err.message });
      newPost.local!.status = "failed";
      rerender();
      return;
    }
    posts = posts.filter((post) => post.id !== newPost.id);
    posts = [createdPost!, ...(posts || [])];
    rerender();
  };

  let containerEl = (
    <div class={style.container}>
      {showInputArea && (
        <PostInputArea onPostCreate={handlePostCreate} signal={props.signal} />
      )}
      {postsEl}
    </div>
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

let inputContent = "";

let respectfulPopupShown = false;

interface PostCreateEvent {
  content: string;
}

const PostInputArea = (props: {
  signal: AbortSignal;
  onPostCreate: (e: PostCreateEvent) => void;
}) => {
  const footer = (
    <div class={style.footerContainer}>
      <Button
        icon="send"
        hoverBorder
        class={style.sendButton}
        data-action="send"
      />
    </div>
  );
  const el = (
    <div class={style.inputAreaContainer}>
      <Input
        showFormatBar
        value={inputContent}
        showFormatBarEmoji
        type="textarea"
        placeholder={t`Create a post...`}
        footer={footer}
      />
    </div>
  ) as HTMLDivElement;

  const textareaEl = el.querySelector("textarea") as HTMLTextAreaElement;

  textareaEl.addEventListener(
    "click",
    (event) => {
      if (!respectfulPopupShown) {
        event.stopImmediatePropagation();
        event.stopPropagation();
        event.preventDefault();
        textareaEl.blur();
        createRespectfulModal();
        respectfulPopupShown = true;
      }
    },
    { signal: props.signal },
  );

  textareaEl.addEventListener(
    "input",
    () => {
      inputContent = textareaEl.value;
    },
    { signal: props.signal },
  );

  el.addEventListener(
    "click",
    (event) => {
      if (getClosestElementFromEvent(event, `[data-action="send"]`)) {
        props.onPostCreate({ content: inputContent });
      }
    },
    { signal: props.signal },
  );

  handleFormatBar({
    signal: props.signal,
    inputContainer: el,
    onTextUpdate(text) {
      inputContent = text;
      textareaEl.value = text;
    },
  });

  createTextareaHeightHandler({
    textarea: textareaEl,
    signal: props.signal,
  });

  return el;
};

const createRespectfulModal = () => {
  const ac = new AbortController();
  const { signal } = ac;

  const modalEl = (
    <Modal.Root disableGestures ignoreBgClick>
      <Modal.Header warn label={t`Respectful Posting`} icon="diversity_1" />
      <Modal.Body maxWidth="400px" class={style.respectfulModal}>
        <div>
          <Trans>
            Please be <strong>respectful</strong> when creating posts.
          </Trans>
        </div>
        <div>
          <Trans>
            <strong>Self-harm</strong> content is not allowed.
          </Trans>
        </div>

        <div class={style.warningText}>
          <Trans>
            Violating these rules may result in content removal or account
            suspension.
          </Trans>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          warn
          primary
          data-action="close"
          icon="diversity_1"
          label={t`I Will Be Respectful`}
          onClick={() => ac.abort()}
        />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  modalEl
    .querySelector('[data-action="close"]')
    ?.addEventListener("click", () => ac.abort(), { signal });

  createModal(() => modalEl, ac);
};
