import { t } from "@lingui/core/macro";

import {
  deletePost,
  getPost,
  likePost,
  repostPost,
  unlikePost,
} from "../../services/PostService";
import { accountStore } from "../../store/accountStore";
import type { RawPost } from "../../Types";
import { dateMarkerLabel, formatTimestamp, timeSince } from "../../utils/date";
import { closestFromEvent } from "../../utils/dom";
import { FocusAnimator } from "../../utils/FocusAnimator";
import { getFont } from "../../utils/font";
import { HoverAnimator } from "../../utils/HoverAnimator";
import { inviteLinkRegex } from "../../utils/regex";
import { router } from "../../utils/router";
import { Icon } from "../icon";
import { Markup } from "../markup/markup";
import { FileEmbed } from "../message-pane/FileEmbed";
import {
  createImageEmbedResizer,
  ImageEmbed,
} from "../message-pane/imageEmbed";
import { InviteEmbed } from "../message-pane/InviteEmbed";
import { OGEmbed } from "../message-pane/OGEmbed";
import { isNewUser } from "../message-pane/utils";
import { ServerClanItem } from "../serverClanItem";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { handleImagePreviewModal } from "../ui/ImagePreviewModal";
import { Link } from "../ui/link";
import { alert } from "../ui/modal";

import style from "./PostItem.module.css";

const postCache = new Map<string, RawPost>();
const POST_CACHE_LIMIT = 100;

const setPostCache = (post: RawPost) => {
  if (postCache.size >= POST_CACHE_LIMIT) {
    const firstKey = postCache.keys().next().value;
    if (firstKey) postCache.delete(firstKey);
  }
  postCache.set(post.id, post);
};

export const cacheOrFetchPost = async (postId: string) => {
  let post: RawPost | null = postCache.get(postId) || null;
  if (!post) {
    [post] = await getPost(postId);
    if (post) setPostCache(post);
  }
  return post;
};

const postElToPost = new WeakMap<HTMLDivElement, RawPost>();

export const PostItem = (props: {
  postId?: string;
  post?: RawPost | null;
  prevPost?: RawPost;
  forceBottomBorder?: boolean;
  disableHover?: boolean;
  nextPost?: RawPost;
  hideNewDayMarker?: boolean;
  container: HTMLDivElement;
  showFullDate?: boolean;
}) => {
  const post = props.post || postCache.get(props.postId!);

  if (!post) return <div>Post not found</div>;

  const link = `/p/${post.id}`;

  const creator = post.createdBy;

  const newDay = !props.hideNewDayMarker && isNewDay(post, props.prevPost);
  const hasBottomBorder =
    props.forceBottomBorder ||
    (props.nextPost &&
      (props.hideNewDayMarker || !isNewDay(props.nextPost, post)));

  const isImageEmbedOnly =
    post.embed?.type == "image" && !post.content?.includes(" ");

  const font = getFont(creator.profile?.font);

  const el = (
    <div class="postItemOuter" data-id={post.id}>
      {newDay && <Marker label={dateMarkerLabel(post.createdAt)} />}

      <div
        class={[
          "postItem",
          style.postItem,
          style.withDetails,
          hasBottomBorder && style.withBottomBorder,
        ]}
        data-disable-hover={props.disableHover}
        data-status={post.local?.status}
      >
        <div class={[style.postContainer, "postContainer"]}>
          <Link
            href={`/app/profile/${creator.id}`}
            data-user-id={creator.id}
            class={style.avatar}
          >
            <Avatar
              user={creator}
              size={40}
              hoverSelector={`.${style.postItem}`}
            />
          </Link>
          <div class={style.postBody}>
            <span class={[style.details, "details"]}>
              <Link
                data-user-id={creator.id}
                decoration
                href={`/app/profile/${creator.id}`}
                class={[style.username, font?.class, "font"]}
              >
                {creator.username}
              </Link>
              {isNewUser(creator) && (
                <Icon
                  class={style.newUserIcon}
                  name="deceased"
                  title={t`New to Nerimity`}
                />
              )}
              {creator?.profile?.clan && (
                <ServerClanItem clan={creator.profile.clan} />
              )}

              {creator.bot && <div class={style.badge}>{t`Bot`}</div>}
              <Link
                href={link}
                decoration
                class={style.timestamp}
                title={formatTimestamp(post.createdAt)}
              >
                {(props.showFullDate ? formatTimestamp : timeSince)(
                  post.createdAt,
                )}
              </Link>
            </span>
            <div class={style.content}>
              {!isImageEmbedOnly && (
                <Markup
                  replaceCommandBotId
                  animateInitialOnFocus
                  text={post.content || ""}
                  container={props.container}
                  class={["focusAnimate", style.postContent]}
                />
              )}
              <PostEmbeds post={post} container={props.container} />
            </div>
            <PostInfo post={post} />
          </div>
        </div>
      </div>
    </div>
  ) as HTMLDivElement;

  postElToPost.set(el, post);
  if (props.post) {
    setPostCache(props.post);
  }

  return el;
};

const PostInfo = (props: { post: RawPost }) => {
  const likes = props.post._count.likedBy.toLocaleString();
  const comments = props.post._count.comments.toLocaleString();
  const reposts = props.post._count.reposts.toLocaleString();
  const views = props.post.views.toLocaleString();

  const liked = props.post.likedBy.length;
  const reposted = props.post?.reposts?.find(
    (r) => r.createdBy.id === accountStore.currentUser?.id,
  );

  return (
    <div class={style.postInfo}>
      <Button
        iconOutlined={!liked}
        icon="favorite"
        label={likes}
        alert
        hoverBorder={!liked}
        data-action={liked ? "unlike" : "like"}
        primary={!!liked}
      />
      <Button data-action="comment" icon="chat" label={comments} hoverBorder />
      <Button
        data-action={reposted ? "unrepost" : "repost"}
        iconOutlined={!reposted}
        icon="repeat"
        label={reposts}
        hoverBorder={!reposted}
        primary={!!reposted}
        success
      />
      <div class={style.views} title={t`Estimated Views`}>
        <Icon class={style.viewsIcon} name="visibility" />
        {views}
      </div>
    </div>
  );
};

const Marker = (props: { label?: string }) => {
  return (
    <div class={style.marker}>
      <span>{props.label}</span>
      <div class={style.line} />
    </div>
  );
};

const PostEmbeds = (props: { post: RawPost; container: HTMLDivElement }) => {
  const attachment = props.post.attachments?.[0];

  const embed = props.post.embed;

  const imageAttachment = !!attachment?.width;
  // const attachmentProperty = props.message.attachmentProperty;
  const imageEmbed = embed?.type === "image" && embed?.imageHeight !== null;

  const isVideo = attachment?.mime?.startsWith("video/");
  const isAudio = attachment?.mime?.startsWith("audio/");

  const inviteCode = props.post.content?.match(inviteLinkRegex)?.[1];

  if (inviteCode) {
    return <InviteEmbed code={inviteCode} />;
  }

  if (
    (attachment && !imageAttachment) ||
    // (attachmentProperty && !attachmentProperty.image) ||
    isVideo ||
    isAudio
  )
    return (
      <FileEmbed
        attachment={attachment}
        // attachmentProperty={attachmentProperty}
      />
    );

  if (embed && embed?.type !== "image") {
    return (
      <OGEmbed embed={embed} container={props.container} customHeight={1120} />
    );
  }
  if (
    imageAttachment ||
    imageEmbed
    //  || attachmentProperty?.image
  ) {
    return (
      <ImageEmbed
        attachment={attachment}
        embed={embed}
        horizPadding={66}

        // attachmentProperty={attachmentProperty}

        container={props.container}
        customHeight={1120}
      />
    );
  }
  return null;
};

const MS_PER_DAY = 86400000;
const TZ_OFFSET = new Date().getTimezoneOffset() * 60000;

const dayNumber = (ts: number) => Math.floor((ts - TZ_OFFSET) / MS_PER_DAY);

const isNewDay = (
  attach: { createdAt: number },
  prev?: { createdAt: number },
) => {
  if (!prev) return true;
  return dayNumber(attach.createdAt) !== dayNumber(prev.createdAt);
};

export const updatePostItemNextPost = (
  el: HTMLDivElement,
  nextPost: RawPost,
  hideNewDayMarker: boolean,
) => {
  const post = postElToPost.get(el);
  const postItem = el.querySelector(`.${style.postItem}`);
  if (!post || !postItem) return;

  postItem.classList.toggle(
    style.withBottomBorder!,
    hideNewDayMarker || !isNewDay(nextPost, post),
  );
};

const rerenderPostInfo = (el: HTMLDivElement) => {
  const post = postElToPost.get(el);
  if (!post) return;
  const postInfoEl = el.querySelector(`.${style.postInfo}`) as HTMLDivElement;
  if (!postInfoEl) return;
  postInfoEl.replaceWith(<PostInfo post={post} />);
};

export const createPostHandler = (opts: {
  signal: AbortSignal;
  container: HTMLDivElement;
}) => {
  const imageEmbedFocusAnimator = new FocusAnimator(
    opts.container,
    ".imageEmbed .image, .focusAnimate .emoji",
  );

  const imageEmbedResizer = createImageEmbedResizer(opts.container);

  handleImagePreviewModal({
    root: opts.container,
    signal: opts.signal,
    selector: ".imageEmbed .image",
  });

  const hoverAnimator = new HoverAnimator(opts.container, [
    { trigger: `.postItemOuter`, image: ".clanIcon img" },
    { trigger: `.postItemOuter`, image: ".avatar img" },
    { trigger: `.postItemOuter`, image: "details .emoji" },
  ]);

  opts.signal.addEventListener(
    "abort",
    () => {
      imageEmbedResizer.destroy();
      imageEmbedFocusAnimator.destroy();
      hoverAnimator.destroy();
    },
    { signal: opts.signal },
  );

  const lastDownPos = { x: 0, y: 0 };

  opts.container.addEventListener("pointerdown", (e) => {
    lastDownPos.x = e.clientX;
    lastDownPos.y = e.clientY;
  });

  opts.container.addEventListener(
    "click",
    async (e) => {
      if (accountStore.currentUser?.id === undefined) return;

      const postEl = closestFromEvent(e, `.postItemOuter[data-id]`);
      if (!postEl) return;
      const post = postElToPost.get(postEl);
      if (!post) return;

      const actionEl = closestFromEvent(e, `[data-action]`) as HTMLDivElement;
      const action = actionEl?.dataset?.action;
      if (action === "like") {
        const [res, err] = await likePost(post.id);
        if (err) {
          alert({ message: err.message });
          return;
        }
        post._count.likedBy = res._count.likedBy;
        post.likedBy = res.likedBy;
        rerenderPostInfo(postEl);
        return;
      }
      if (action === "unlike") {
        const [res, err] = await unlikePost(post.id);
        if (err) {
          alert({ message: err.message });
          return;
        }
        post._count.likedBy = res._count.likedBy;
        post.likedBy = res.likedBy;
        rerenderPostInfo(postEl);
        return;
      }
      if (action === "repost") {
        const [res, err] = await repostPost(post.id);
        if (err) {
          alert({ message: err.message });
          return;
        }
        post.repost = res.repost;
        post._count.reposts = res.repost?._count.reposts || 0;
        post.reposts = res.repost?.reposts || [];
        rerenderPostInfo(postEl);
        return;
      }
      if (action === "unrepost") {
        const repostId = post.reposts.find(
          (r) => r.createdBy.id === accountStore.currentUser?.id!,
        )?.id;
        if (!repostId) return;

        const [, error] = await deletePost(repostId);
        if (error) {
          alert({ message: error.message });
          return;
        }
        post.reposts = post.reposts.filter(
          (r) => r.createdBy.id != accountStore.currentUser?.id!,
        );
        post._count.reposts = post._count.reposts - 1;
        rerenderPostInfo(postEl);
        return;
      }

      if (closestFromEvent(e, "a")) return;
      if (closestFromEvent(e, "img")) return;

      const isClick =
        Math.abs(e.clientX - lastDownPos.x) < 5 &&
        Math.abs(e.clientY - lastDownPos.y) < 5;
      if (!isClick) return;

      router.navigate(`/p/${post.id}`);
    },
    { signal: opts.signal },
  );
};
